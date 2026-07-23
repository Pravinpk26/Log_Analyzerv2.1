"""
AI-Based Incident Summary, powered by Google's Gemini API.

Design notes:
  - The API key is read ONLY from the GEMINI_API_KEY environment variable
    — never hard-coded, never accepted as a request parameter, and never
    logged. Put it in a `.env` file (see `.env.example`) that is
    git-ignored.
  - This is additive: if the key is missing or the call fails for any
    reason (network, quota, malformed response), the function returns a
    clearly-labeled fallback summary instead of raising — the rest of
    the dashboard (rule-based insights, MITRE mapping, scores) never
    depends on this succeeding.
  - Gemini is used purely to turn already-computed findings into a
    readable analyst-style narrative. It is NOT used to decide severity
    or confidence scores — those come from the deterministic rule engine
    above, so the numbers on the dashboard stay reproducible and
    auditable even if the AI wording changes between runs.
"""

import os
import json
import requests

GEMINI_MODEL = "gemini-2.0-flash"
GEMINI_ENDPOINT = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent"
)


def _build_prompt(statistics, anomalies, threats, security_posture):
    findings_text = "\n".join(
        f"- [{f.get('severity', 'Unknown')}] {f.get('type', 'Anomaly')}: {f.get('message', '')}"
        for f in (anomalies or []) + (threats or [])
    ) or "- No anomalies or threat findings were recorded."

    return (
        "You are a security analyst summarizing an authentication-monitoring session "
        "for a dashboard. Be concise (3-5 sentences), factual, and do not invent details "
        "beyond what's given. Do not use markdown headers.\n\n"
        f"Security score: {security_posture.get('risk_score', 'Unknown')}/100 "
        f"({security_posture.get('risk_level', 'Unknown')} risk)\n"
        f"Total logins: {statistics.get('total_logins', 0)}, "
        f"Failed: {statistics.get('failed_logins', 0)}, "
        f"Unique IPs: {statistics.get('unique_ips', 0)}\n\n"
        f"Findings:\n{findings_text}\n\n"
        "Write a short incident summary an analyst could read in 10 seconds, then one "
        "sentence of recommended next action."
    )


def generate_incident_summary(statistics, anomalies, threats, security_posture):
    """
    Returns:
        {
            "summary": str,
            "source": "gemini" | "fallback",
            "note": str | None   # explains why fallback was used, if applicable
        }
    """

    api_key = os.environ.get("GEMINI_API_KEY")

    if not api_key:
        return {
            "summary": _fallback_summary(statistics, anomalies, threats, security_posture),
            "source": "fallback",
            "note": "GEMINI_API_KEY is not set — add it to Backend/.env to enable AI-generated summaries.",
        }

    prompt = _build_prompt(statistics, anomalies, threats, security_posture)

    try:
        response = requests.post(
            GEMINI_ENDPOINT,
            params={"key": api_key},
            json={
                "contents": [
                    {"parts": [{"text": prompt}]}
                ],
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 300,
                },
            },
            timeout=15,
        )

        if response.status_code != 200:
            return {
                "summary": _fallback_summary(statistics, anomalies, threats, security_posture),
                "source": "fallback",
                "note": f"Gemini API returned HTTP {response.status_code}.",
            }

        data = response.json()
        text = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text")
        )

        if not text:
            return {
                "summary": _fallback_summary(statistics, anomalies, threats, security_posture),
                "source": "fallback",
                "note": "Gemini API response did not contain text output.",
            }

        return {
            "summary": text.strip(),
            "source": "gemini",
            "note": None,
        }

    except Exception as exc:
        return {
            "summary": _fallback_summary(statistics, anomalies, threats, security_posture),
            "source": "fallback",
            "note": f"Gemini API call failed: {exc}",
        }


def _fallback_summary(statistics, anomalies, threats, security_posture):
    """Deterministic, non-AI summary used whenever Gemini isn't available."""

    all_findings = (anomalies or []) + (threats or [])
    high = [f for f in all_findings if f.get("severity") == "High"]

    score = security_posture.get("risk_score", "Unknown")
    level = security_posture.get("risk_level", "Unknown")

    if high:
        lead = f"{len(high)} high-severity finding(s) detected, including: {high[0].get('type')}."
    elif all_findings:
        lead = f"{len(all_findings)} finding(s) detected, none rated High severity."
    else:
        lead = "No anomalies detected in the current session."

    return (
        f"{lead} Security score is {score}/100 ({level} risk), based on "
        f"{statistics.get('total_logins', 0)} login event(s) and "
        f"{statistics.get('unique_ips', 0)} unique IP address(es)."
    )
