"""
Maps internal anomaly/threat "type" strings onto MITRE ATT&CK techniques.

This is intentionally a static lookup table, not a classifier — MITRE
mapping is a matter of correctly citing the framework, not inference, so
a deterministic dict is the right tool and avoids ever inventing a
technique ID that doesn't exist.

Reference: https://attack.mitre.org/
"""

MITRE_MAP = {
    "Impossible Travel": {
        "tactic": "TA0001 - Initial Access",
        "technique_id": "T1078",
        "technique_name": "Valid Accounts",
        "why": "Geographically implausible logins usually mean a valid credential is being used from more than one location/actor.",
    },
    "Unrecognized Device": {
        "tactic": "TA0001 - Initial Access",
        "technique_id": "T1078.004",
        "technique_name": "Valid Accounts: Cloud Accounts",
        "why": "A device/browser never seen before on this account is a classic sign of credential reuse from an attacker's machine.",
    },
    "New Device Login": {
        "tactic": "TA0001 - Initial Access",
        "technique_id": "T1078.004",
        "technique_name": "Valid Accounts: Cloud Accounts",
        "why": "A device/browser never seen before on this account is a classic sign of credential reuse from an attacker's machine.",
    },
    "Odd Timestamp": {
        "tactic": "TA0001 - Initial Access",
        "technique_id": "T1078",
        "technique_name": "Valid Accounts",
        "why": "Off-hours activity outside the account owner's known pattern is a behavioral indicator of unauthorized use.",
    },
    "Unsolicited MFA Prompt": {
        "tactic": "TA0006 - Credential Access",
        "technique_id": "T1621",
        "technique_name": "Multi-Factor Authentication Request Generation",
        "why": "Repeated/unsolicited MFA push prompts are the signature of an 'MFA fatigue' attack trying to get a user to approve access.",
    },
    "Repeated Password Resets": {
        "tactic": "TA0006 - Credential Access",
        "technique_id": "T1098",
        "technique_name": "Account Manipulation",
        "why": "Unexpected repeated password-reset attempts often precede an account-takeover attempt or are used to lock the real owner out.",
    },
    "Disabled Security Controls": {
        "tactic": "TA0005 - Defense Evasion",
        "technique_id": "T1556",
        "technique_name": "Modify Authentication Process",
        "why": "Turning off MFA or login notifications without the owner's action is a direct attempt to remove detection/response capability.",
    },
    "Suspicious IP Address": {
        "tactic": "TA0011 - Command and Control",
        "technique_id": "T1090",
        "technique_name": "Proxy",
        "why": "Logins via Tor, anonymizing proxies, or known-malicious hosting ranges are used to mask an attacker's true origin.",
    },
    "Authentication Failure": {
        "tactic": "TA0006 - Credential Access",
        "technique_id": "T1110",
        "technique_name": "Brute Force",
        "why": "Repeated failed authentication attempts are the primary signature of password guessing / credential stuffing.",
    },
    "Multiple IP Addresses": {
        "tactic": "TA0006 - Credential Access",
        "technique_id": "T1110.004",
        "technique_name": "Brute Force: Credential Stuffing",
        "why": "A single account receiving logins from many distinct IPs in a short window is typical of distributed credential-stuffing tooling.",
    },
    "VPN Usage": {
        "tactic": "TA0005 - Defense Evasion",
        "technique_id": "T1090.003",
        "technique_name": "Proxy: Multi-hop Proxy",
        "why": "VPN-origin logins can be legitimate, but are also a common way to obscure the true source of unauthorized access.",
    },
}

DEFAULT_MAPPING = {
    "tactic": "TA0001 - Initial Access",
    "technique_id": "T1078",
    "technique_name": "Valid Accounts",
    "why": "Unclassified anomaly involving authentication activity; defaulted to the general Valid Accounts technique.",
}


def get_mitre_mapping(anomaly_type: str) -> dict:
    return MITRE_MAP.get(anomaly_type, DEFAULT_MAPPING)
