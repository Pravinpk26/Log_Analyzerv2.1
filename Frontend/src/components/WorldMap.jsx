import { useMemo, useState } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'

// Real interactive world map (react-simple-maps + d3-geo). Every country
// shape is rendered individually from real topojson geometry — there is no
// continent-level grouping anywhere in this file. A country is only ever
// colored if it has a matching entry in the `countries` prop (derived
// straight from real authentication events via
// lib/derive.js -> aggregateCountryStats). Every other country renders
// flat dark grey — no partial/fuzzy matching that could light up
// neighbors or whole regions.
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

const DEFAULT_FILL = '#2E2E2E'

// Semantic security colors — the map communicates SEVERITY, not volume.
// Exactly four flat colors, no shade variations within a tier.
const RISK_COLORS = {
  Low: '#22C55E',
  Medium: '#FACC15',
  High: '#F97316',
  Critical: '#EF4444',
}

const RISK_RANK = { Low: 0, Medium: 1, High: 2, Critical: 3 }

// Four-tier risk classification for the map specifically (severity-first,
// not just a raw event count). Failure ratio drives severity; total volume
// only pushes an already-risky country up rather than a busy-but-clean one.
function riskTierFor(country) {
  const events = country?.events || 0
  const failed = country?.failed || 0
  if (events === 0) return 'Low'

  const failRatio = failed / events

  if (failRatio >= 0.75 || (failed >= 8 && failRatio >= 0.5)) return 'Critical'
  if (failRatio >= 0.5) return 'High'
  if (failRatio > 0) return 'Medium'
  return 'Low'
}

// ip-api.com's country names occasionally differ from the Natural Earth
// admin-0 names baked into world-atlas's topojson. Exact lookup only — no
// substring/fuzzy matching, so it can't cause broader mismatches.
const NAME_ALIASES = {
  'united states': 'united states of america',
  'czech republic': 'czechia',
  'the netherlands': 'netherlands',
}

function normalize(name = '') {
  const lower = name.trim().toLowerCase()
  return NAME_ALIASES[lower] || lower
}

export default function WorldMap({ countries = [], height = 220 }) {
  const [hovered, setHovered] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [loaded, setLoaded] = useState(false)

  // Exact country-name -> event-data (+ computed risk tier) lookup. A
  // country only ever appears here if it literally exists in the
  // authentication dataset.
  const byName = useMemo(() => {
    const map = new Map()
    for (const c of countries) {
      if (c?.country) map.set(normalize(c.country), { ...c, tier: riskTierFor(c) })
    }
    return map
  }, [countries])

  // The single highest-risk country on the map — the only one that gets
  // the pulse treatment. Ties broken by event volume.
  const topThreat = useMemo(() => {
    let best = null
    for (const c of byName.values()) {
      if (
        !best ||
        RISK_RANK[c.tier] > RISK_RANK[best.tier] ||
        (RISK_RANK[c.tier] === RISK_RANK[best.tier] && c.events > best.events)
      ) {
        best = c
      }
    }
    return best && RISK_RANK[best.tier] > 0 ? best : null // don't pulse if nothing's actually risky
  }, [byName])

  function handleMove(e) {
    const rect = e.currentTarget.closest('.world-map-wrap')?.getBoundingClientRect()
    if (!rect) return
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  // The GeoMap enforces its own minimum height so the map stays the
  // dominant visual element of the card even if a smaller height is passed.
  const mapHeight = Math.max(height, 260)

  return (
    <div className="world-map-wrap relative w-full" style={{ height: mapHeight }}>
      <div
        className="w-full h-full transition-opacity duration-700 ease-out"
        style={{ opacity: loaded ? 1 : 0 }}
      >
        <ComposableMap
          projectionConfig={{ scale: 148 }}
          width={800}
          height={420}
          style={{ width: '100%', height: '100%' }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) => {
              if (!loaded) setLoaded(true)
              return geographies.map((geo) => {
                // Each `geo` here is ONE individual country feature — no
                // continent/region grouping at any point in this loop.
                const name = geo.properties?.name || geo.properties?.NAME || ''
                const match = byName.get(normalize(name))
                const fill = match ? RISK_COLORS[match.tier] : DEFAULT_FILL
                const isHovered = Boolean(match) && hovered?.country === match.country

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => match && setHovered(match)}
                    onMouseMove={handleMove}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      // Flat fill everywhere — no glow baked into the
                      // polygon itself, even for the top-threat country.
                      // The pulse is a separate marker layered on top.
                      default: {
                        fill,
                        stroke: '#181818',
                        strokeWidth: 0.4,
                        outline: 'none',
                        filter: isHovered ? 'brightness(1.4)' : 'brightness(1)',
                        transition: 'filter 150ms ease',
                        cursor: match ? 'pointer' : 'default',
                      },
                      hover: {
                        fill,
                        stroke: '#181818',
                        strokeWidth: 0.4,
                        outline: 'none',
                        filter: 'brightness(1.4)',
                      },
                      pressed: {
                        fill,
                        outline: 'none',
                      },
                    }}
                  />
                )
              })
            }}
          </Geographies>

          {/* Soft pulse — ONLY on the single highest-risk country, so the
              eye is drawn to the biggest threat instead of every
              highlighted country glowing equally. */}
          {topThreat?.lon != null && topThreat?.lat != null && (
            <Marker coordinates={[topThreat.lon, topThreat.lat]}>
              <circle r={9} fill={RISK_COLORS[topThreat.tier]} opacity={0.35} className="world-map-pulse-ring" />
              <circle r={9} fill={RISK_COLORS[topThreat.tier]} opacity={0.35} className="world-map-pulse-ring world-map-pulse-ring-delay" />
              <circle r={3.5} fill={RISK_COLORS[topThreat.tier]} stroke="#181818" strokeWidth={0.75} />
            </Marker>
          )}
        </ComposableMap>
      </div>

      {hovered && (
        <div
          className="absolute card px-3 py-2 shadow-panel min-w-[170px] z-10 pointer-events-none transition-opacity duration-200 ease-out"
          style={{
            left: Math.min(mousePos.x + 12, 9999),
            top: Math.max(mousePos.y - 12, 0),
            opacity: hovered ? 1 : 0,
          }}
        >
          <p className="text-[12.5px] font-semibold text-ink">{hovered.country}</p>
          <div className="mt-1 flex flex-col gap-0.5">
            <TooltipRow label="Authentication Events" value={hovered.events} />
            <TooltipRow label="Failed Logins" value={hovered.failed} />
            <TooltipRow label="Unique IPs" value={hovered.uniqueIps ?? '—'} />
            <TooltipRow
              label="Risk Level"
              value={hovered.tier}
              valueClass={
                hovered.tier === 'Critical'
                  ? 'text-brand-red'
                  : hovered.tier === 'High'
                  ? 'text-[#F97316]'
                  : hovered.tier === 'Medium'
                  ? 'text-[#FACC15]'
                  : 'text-brand-green'
              }
            />
          </div>
        </div>
      )}

      {countries.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-[12.5px] text-ink-faint pointer-events-none">
          No geolocation data yet
        </div>
      )}

      <div className="absolute bottom-1.5 right-1.5 flex items-center gap-3 bg-panel/70 backdrop-blur-sm rounded-md px-2.5 py-1.5">
        <LegendDot color={RISK_COLORS.Low} label="Low" />
        <LegendDot color={RISK_COLORS.Medium} label="Medium" />
        <LegendDot color={RISK_COLORS.High} label="High" />
        <LegendDot color={RISK_COLORS.Critical} label="Critical" />
      </div>

      <style>{`
        .world-map-pulse-ring {
          transform-origin: center;
          transform-box: fill-box;
          animation: world-map-pulse 2.2s ease-out infinite;
        }
        .world-map-pulse-ring-delay {
          animation-delay: 1.1s;
        }
        @keyframes world-map-pulse {
          0% { transform: scale(0.6); opacity: 0.45; }
          70% { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        body.reduced-motion .world-map-pulse-ring {
          animation: none;
          opacity: 0.35;
        }
      `}</style>
    </div>
  )
}

function TooltipRow({ label, value, valueClass = 'text-ink' }) {
  return (
    <p className="text-[11px] text-ink-muted flex items-center justify-between gap-4">
      <span>{label}</span>
      <span className={`font-medium ${valueClass}`}>{value}</span>
    </p>
  )
}

function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-[10px] text-ink-muted whitespace-nowrap">{label}</span>
    </span>
  )
}