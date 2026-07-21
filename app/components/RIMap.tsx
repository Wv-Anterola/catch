"use client";

import type { CityStat, Hospital } from "@/lib/types";
import { RI_MAP, RI_TOWNS, projectRI } from "@/lib/ri-map";

// Well-separated anchor cities kept always-labeled so the map is orientable.
const ANCHORS = new Set(["Providence", "Warwick", "Newport", "Westerly", "Woonsocket", "Narragansett"]);

function rateColor(rate: number): string {
  const t = Math.min(rate / 25, 1);
  const mix = (a: number[], b: number[]) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const [r, g, b] = mix([21, 88, 138], [179, 38, 30]);
  return `rgb(${r},${g},${b})`;
}

// Accurate Rhode Island basemap (39 Census municipalities) with care-gap dots and
// hospitals plotted by real lat/lon. Controlled `hover` so a sibling list can cross-highlight.
export default function RIMap({
  cities,
  hospitals,
  hover,
  onHover,
}: {
  cities: CityStat[];
  hospitals: Hospital[];
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
        className="w-full h-auto"
        role="img"
        aria-label="Map of Rhode Island showing potential hypertension care-gap concentration by community"
      >
        {/* basemap */}
        <g fill="#eef1f4" stroke="#c3ccd6" strokeWidth={0.9} strokeLinejoin="round">
          {RI_TOWNS.map((t) => (
            <path key={t.name} d={t.d} />
          ))}
        </g>

        {/* hospitals (subtle) */}
        <g stroke="#9aa4b0" strokeWidth={1.6}>
          {hospitals
            .filter((h) => h.lat && h.lon)
            .map((h, i) => {
              const [x, y] = projectRI(h.lon, h.lat);
              return (
                <path key={`h${i}`} d={`M${x - 4},${y} h8 M${x},${y - 4} v8`}>
                  <title>{h.name}</title>
                </path>
              );
            })}
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
                  stroke={active ? "#182430" : "#ffffff"}
                  strokeWidth={active ? 2.5 : 1.3}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => onHover(c.city)}
                  onMouseLeave={() => onHover(null)}
                >
                  <title>{`${c.city}: ${c.flagged} of ${c.adults} adults (${c.rate}%)`}</title>
                </circle>
              );
            })}
        </g>

        {/* labels: anchors always, plus the hovered city. Flip below the dot when
            placing above would clip past the top edge (e.g. Woonsocket). */}
        <g fill="#28323f" fontWeight={600} style={{ paintOrder: "stroke" }} stroke="#ffffff" strokeWidth={5} strokeLinejoin="round">
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

      {/* hover callout */}
      {hovered && (
        <div className="absolute top-2 right-2 surface px-3 py-2 text-[12px] pointer-events-none shadow-sm">
          <div className="font-semibold text-[13px]">{hovered.city}</div>
          <div className="text-[color:var(--muted)]">
            {hovered.flagged.toLocaleString()} of {hovered.adults.toLocaleString()} adults ·{" "}
            <span className="font-semibold" style={{ color: rateColor(hovered.rate) }}>{hovered.rate}%</span> flagged
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
        <span>✚ hospital</span>
      </div>
    </div>
  );
}
