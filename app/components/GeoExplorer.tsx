"use client";

import { useState } from "react";
import type { CityStat, Hospital } from "@/lib/types";
import RIMap from "./RIMap";

// Map + ranked list sharing one hover state, so hovering a community in either place
// highlights it in the other.
export default function GeoExplorer({ cities, hospitals }: { cities: CityStat[]; hospitals: Hospital[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const ranked = cities.slice().sort((a, b) => b.rate - a.rate).slice(0, 14);
  const maxRate = Math.max(...ranked.map((c) => c.rate), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,440px)_1fr] gap-8 items-start">
      <div>
        <h2 className="text-[14px] font-semibold">Care-gap concentration by community</h2>
        <p className="text-[12px] text-[color:var(--muted)] mt-0.5 mb-3">
          Each dot is a community: larger means more people flagged, redder means a higher care-gap
          rate. Hover to explore.
        </p>
        <RIMap cities={cities} hospitals={hospitals} hover={hover} onHover={setHover} />
      </div>

      <div>
        <h2 className="text-[14px] font-semibold mb-3">Communities by care-gap rate</h2>
        <div className="surface divide-y divide-[color:var(--border)]">
          {ranked.map((c) => (
            <div
              key={c.city}
              onMouseEnter={() => setHover(c.city)}
              onMouseLeave={() => setHover(null)}
              className={`px-3 py-2.5 transition-colors ${hover === c.city ? "bg-[color:var(--accent-weak)]" : ""}`}
            >
              <div className="flex items-baseline justify-between gap-2 text-[13px]">
                <span className="truncate font-medium">{c.city}</span>
                <span className="tabular-nums text-[color:var(--muted)] shrink-0">
                  {c.rate}% <span className="text-[color:var(--faint)]">· {c.flagged}/{c.adults}</span>
                </span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-[color:var(--panel)] overflow-hidden">
                <div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${(c.rate / maxRate) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[color:var(--faint)] mt-2">
          Communities with ≥ 3 adults. Rate = flagged ÷ adults evaluated.
        </p>
      </div>
    </div>
  );
}
