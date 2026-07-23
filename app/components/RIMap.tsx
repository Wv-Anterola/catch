"use client";

import type { CityStat } from "@/lib/types";
import type { FqhcSite } from "@/lib/fqhc";
import { RI_MAP, RI_TOWNS, projectRI } from "@/lib/ri-map";

// Well-separated anchor cities kept always-labeled so the map is orientable.
const ANCHORS = new Set(["Providence", "Warwick", "Newport", "Westerly", "Woonsocket", "Narragansett"]);

// Single-hue sequential ramp (light → deep coral), monotonic in lightness: a higher
// care-gap rate reads as a more intense mark. Exported so the linked community list
// encodes rate the same way the map does.
export function rateColor(rate: number): string {
  const t = Math.max(0, Math.min(rate / 25, 1));
  const mix = (a: number[], b: number[]) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const [r, g, b] = mix([250, 219, 212], [158, 27, 14]);
  return `rgb(${r},${g},${b})`;
}

const FQHC = "#0e3b4b"; // navy marker, kept distinct from the coral rate ramp

// Accurate Rhode Island basemap (39 Census municipalities) with care-gap dots and the
// state's Federally Qualified Health Centers (FQHCs) plotted by real location. CATCH is
// built for FQHCs, so they are the reference sites on the map. `hover` doubles as a
// touch "selected" state: a sibling list can cross-highlight, and tapping a dot toggles
// it (tap empty map clears).
export default function RIMap({
  cities,
  fqhcs,
  hover,
  onHover,
}: {
  cities: CityStat[];
  fqhcs: FqhcSite[];
  hover: string | null;
  onHover: (city: string | null) => void;
}) {
  const pts = cities.filter((c) => c.lat != null && c.lon != null);
  const maxF = Math.max(...pts.map((c) => c.flagged), 1);
  const rad = (f: number) => 10 + Math.sqrt(f / maxF) * 42;
  const hovered = pts.find((c) => c.city === hover) ?? null;
  const labeled = pts.filter((c) => ANCHORS.has(c.city));

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${RI_MAP.width} ${RI_MAP.height}`}
        className="w-full h-auto touch-manipulation"
        role="img"
        aria-label="Map of Rhode Island showing potential hypertension care-gap concentration by community, with the state's Federally Qualified Health Centers marked"
      >
        {/* transparent backdrop: tapping empty map clears the selection on touch */}
        <rect
          x={0}
          y={0}
          width={RI_MAP.width}
          height={RI_MAP.height}
          fill="transparent"
          onClick={() => onHover(null)}
        />

        {/* basemap */}
        <g fill="#eef1f4" stroke="#c3ccd6" strokeWidth={0.9} strokeLinejoin="round">
          {RI_TOWNS.map((t) => (
            <path key={t.name} d={t.d} />
          ))}
        </g>

        {/* care-gap dots (largest drawn first so small ones stay clickable on top) */}
        <g>
          {pts
            .slice()
            .sort((a, b) => b.flagged - a.flagged)
            .map((c) => {
              const [x, y] = projectRI(c.lon as number, c.lat as number);
              const active = hover === c.city;
              const R = rad(c.flagged);
              return (
                <circle
                  key={c.city}
                  cx={x}
                  cy={y}
                  r={active ? R + 3 : R}
                  fill={rateColor(c.rate)}
                  fillOpacity={active ? 0.92 : 0.72}
                  stroke={active ? "#0e3b4b" : "#ffffff"}
                  strokeWidth={active ? 2.5 : 1.3}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => onHover(c.city)}
                  onMouseLeave={() => onHover(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onHover(active ? null : c.city);
                  }}
                >
                  <title>{`${c.city}: ${c.flagged} of ${c.adults} adults (${c.rate}%)`}</title>
                </circle>
              );
            })}
        </g>

        {/* FQHCs: drawn ABOVE the care-gap dots as clear health-center markers (navy
            rounded square + white cross) so they stay visible even where a large dot
            sits on the same community. These are the sites CATCH is built for. */}
        <g>
          {fqhcs
            .filter((f) => f.lat && f.lon)
            .map((f, i) => {
              const [x, y] = projectRI(f.lon, f.lat);
              return (
                <g key={`f${i}`}>
                  <rect x={x - 7} y={y - 7} width={14} height={14} rx={3.5} fill={FQHC} stroke="#ffffff" strokeWidth={1.5} />
                  <path
                    d={`M${x},${y - 3.6} v7.2 M${x - 3.6},${y} h7.2`}
                    stroke="#ffffff"
                    strokeWidth={1.9}
                    strokeLinecap="round"
                  />
                  <title>{`${f.org} · ${f.city} · FQHC`}</title>
                </g>
              );
            })}
        </g>

        {/* labels: anchors always, plus the hovered city. Flip below the dot when
            placing above would clip past the top edge (e.g. Woonsocket). */}
        <g fill="#0e3b4b" fontWeight={600} style={{ paintOrder: "stroke" }} stroke="#ffffff" strokeWidth={5} strokeLinejoin="round">
          {labeled.map((c) => {
            const [x, y] = projectRI(c.lon as number, c.lat as number);
            const r = rad(c.flagged);
            const ly = y - r - 6 < 20 ? y + r + 20 : y - r - 6;
            return (
              <text key={c.city} x={x} y={ly} fontSize={22} textAnchor="middle">
                {c.city}
              </text>
            );
          })}
          {hovered && !ANCHORS.has(hovered.city) && (() => {
            const [x, y] = projectRI(hovered.lon as number, hovered.lat as number);
            const r = rad(hovered.flagged);
            const ly = y - r - 6 < 20 ? y + r + 20 : y - r - 6;
            return (
              <text x={x} y={ly} fontSize={22} textAnchor="middle">
                {hovered.city}
              </text>
            );
          })()}
        </g>
      </svg>

      {/* hover / tap callout */}
      {hovered && (
        <div className="absolute top-2 right-2 surface px-3 py-2 text-[12px] pointer-events-none shadow-sm">
          <div className="font-semibold text-[13px]">{hovered.city}</div>
          <div className="text-[color:var(--muted)]">
            {hovered.flagged.toLocaleString()} of {hovered.adults.toLocaleString()} adults ·{" "}
            <span className="font-semibold text-[color:var(--ink)]">{hovered.rate}%</span> flagged
          </div>
        </div>
      )}

      {/* legend */}
      <div className="mt-3 flex items-center gap-5 flex-wrap text-[12px] text-[color:var(--muted)]">
        <div className="flex items-center gap-2">
          <span>Care-gap rate</span>
          <span className="inline-block h-2.5 w-28 rounded-full"
            style={{ background: `linear-gradient(90deg, ${rateColor(0)}, ${rateColor(12)}, ${rateColor(25)})` }} />
          <span className="text-[color:var(--faint)]">0% → 25%+</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block rounded-full bg-[#8a94a0]" style={{ width: 9, height: 9 }} />
          <span className="inline-block rounded-full bg-[#8a94a0]" style={{ width: 17, height: 17 }} />
          <span>= flagged count</span>
        </div>
        <span className="flex items-center gap-1.5">
          <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden>
            <rect x="1.6" y="1.6" width="11.8" height="11.8" rx="3" fill={FQHC} stroke="#ffffff" strokeWidth="1.1" />
            <path d="M7.5,4 v7 M4,7.5 h7" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          FQHC (community health center)
        </span>
      </div>

      <p className="mt-1.5 text-[11px] text-[color:var(--faint)] sm:hidden">
        Tap a dot for its numbers; tap the map to clear.
      </p>
    </div>
  );
}
