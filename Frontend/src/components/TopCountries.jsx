import { countryFlag } from '../lib/derive'
import WorldMap from './WorldMap'

export default function TopCountries({ top, others, maxEvents, cities }) {
  const hasData = top && top.length > 0
  const hasCities = cities && cities.length > 0

  return (
    <div className="card p-5 flex flex-col row-span-2">
      <p className="text-[14px] font-semibold text-ink mb-3">Top Countries (by IP)</p>

      <WorldMap countries={top} maxEvents={maxEvents} height={200} />

      {hasData ? (
        <div className="flex flex-col gap-2.5 mt-4 pt-4 border-t border-panel-border">
          {top.map((c) => {
            const intensity = Math.min(1, c.events / (maxEvents || 1))
            return (
              <div key={c.country} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[12.5px] text-ink-muted">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: intensity > 0.01 ? '#FF6B35' : '#4a4a4a', opacity: 0.4 + intensity * 0.6 }}
                  />
                  <span className="text-[15px] leading-none">{countryFlag(c.code)}</span>
                  {c.country}
                </span>
                <span className="text-[12.5px] font-semibold text-ink">{c.events.toLocaleString()}</span>
              </div>
            )
          })}
          {others > 0 && (
            <div className="flex items-center justify-between pt-1 border-t border-panel-border mt-1">
              <span className="text-[12.5px] text-ink-faint pl-4">Others</span>
              <span className="text-[12.5px] font-semibold text-ink-faint">{others.toLocaleString()}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[12.5px] text-ink-faint mt-4 text-center">No geolocation data yet</p>
      )}

      {hasCities && (
        <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-panel-border">
          <p className="text-[11px] uppercase tracking-wide text-ink-faint">Top Cities</p>
          {cities.map((c) => (
            <div key={`${c.city}|${c.country}`} className="flex items-center justify-between">
              <span className="text-[12.5px] text-ink-muted">
                {c.city}, {c.country}
              </span>
              <span className="text-[12px] text-ink-faint">
                {c.events.toLocaleString()} event{c.events === 1 ? '' : 's'}
                {c.uniqueIps > 1 ? ` · ${c.uniqueIps} IPs` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
