"use client";

import { useMemo, useState } from "react";
import type { CityStat } from "@/lib/types";
import type { FqhcSite } from "@/lib/fqhc";
import { assignCitiesToNearestFqhc } from "@/lib/fqhc";
import RIMap, { rateColor } from "./RIMap";

// Map + ranked list sharing one active state, so hovering (desktop) or tapping (touch) a
// community in either place highlights it in the other. Clicking an FQHC selects its
// catchment: every community it is the nearest care site for. The list then becomes that
// FQHC's target population, so a center can see exactly who it should reach.
export default function GeoExplorer({ cities, fqhcs }: { cities: CityStat[]; fqhcs: FqhcSite[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const [selectedFqhc, setSelectedFqhc] = useState<number | null>(null);

  // city -> nearest FQHC index (catchment assignment), computed once.
  const cityToFqhc = useMemo(() => assignCitiesToNearestFqhc(cities, fqhcs), [cities, fqhcs]);

  const rankedAll = useMemo(
    () => cities.slice().sort((a, b) => b.rate - a.rate),
    [cities],
  );

  // The communities this FQHC is the closest care site for, as its worklist.
  const catchment = useMemo(() => {
    if (selectedFqhc == null) return null;
    const inSet = cities.filter((c) => cityToFqhc[c.city] === selectedFqhc);
    const adults = inSet.reduce((s, c) => s + c.adults, 0);
    const flagged = inSet.reduce((s, c) => s + c.flagged, 0);
    return {
      cities: inSet.slice().sort((a, b) => b.flagged - a.flagged),
      adults,
      flagged,
      rate: adults ? Math.round((flagged / adults) * 100) : 0,
    };
  }, [selectedFqhc, cities, cityToFqhc]);

  const listCities = catchment ? catchment.cities : rankedAll.slice(0, 14);
  const maxRate = Math.max(...listCities.map((c) => c.rate), 1);
  const toggleCity = (city: string) => setHover((cur) => (cur === city ? null : city));
  const selectedSite = selectedFqhc != null ? fqhcs[selectedFqhc] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,440px)_1fr] gap-8 items-start">
      <div>
        <h2 className="text-[14px] font-semibold">Care gaps by community</h2>
        <p className="text-[12px] text-[color:var(--muted)] mt-0.5 mb-3">
          Each dot is a community. A larger dot means more records flagged; a redder dot means a
          higher care-gap rate. Squares mark Rhode Island&apos;s FQHCs; <span className="font-medium text-[color:var(--ink)]">click a square</span> to
          see the communities it is the nearest care site for.
        </p>
        <RIMap
          cities={cities}
          fqhcs={fqhcs}
          hover={hover}
          onHover={setHover}
          cityToFqhc={cityToFqhc}
          selectedFqhc={selectedFqhc}
          onSelectFqhc={setSelectedFqhc}
        />
      </div>

      <div>
        {catchment && selectedSite ? (
          <div className="mb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="eyebrow">Catchment · nearest FQHC</span>
                <h2 className="text-[15px] font-semibold leading-tight mt-0.5">{selectedSite.org}</h2>
                <p className="text-[12px] text-[color:var(--muted)]">{selectedSite.city} · target communities</p>
              </div>
              <button
                onClick={() => setSelectedFqhc(null)}
                className="text-[12px] text-[color:var(--accent)] hover:underline shrink-0 mt-0.5"
              >
                Show all communities
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <CatchStat value={catchment.flagged} label="flagged patients" accent />
              <CatchStat value={catchment.cities.length} label="communities" />
              <CatchStat value={catchment.rate} suffix="%" label="care-gap rate" />
            </div>
          </div>
        ) : (
          <h2 className="text-[14px] font-semibold mb-3">Communities by care-gap rate</h2>
        )}

        <div className="surface divide-y divide-[color:var(--border)] max-h-[520px] overflow-y-auto">
          {listCities.map((c) => (
            <div
              key={c.city}
              role="button"
              tabIndex={0}
              aria-pressed={hover === c.city}
              onMouseEnter={() => setHover(c.city)}
              onMouseLeave={() => setHover(null)}
              onClick={() => toggleCity(c.city)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleCity(c.city);
                }
              }}
              className={`px-3 py-2.5 min-h-[44px] cursor-pointer transition-colors ${hover === c.city ? "bg-[color:var(--accent-weak)]" : "hover:bg-[color:var(--panel)]"}`}
            >
              <div className="flex items-baseline justify-between gap-2 text-[13px]">
                <span className="truncate font-medium">{c.city}</span>
                <span className="tabular-nums text-[color:var(--muted)] shrink-0">
                  {c.rate}% <span className="text-[color:var(--faint)]">· {c.flagged}/{c.adults}</span>
                </span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-[color:var(--panel)] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(c.rate / maxRate) * 100}%`, background: rateColor(c.rate) }} />
              </div>
            </div>
          ))}
          {listCities.length === 0 && (
            <div className="px-3 py-8 text-center text-[12px] text-[color:var(--muted)]">
              No communities are nearest to this site.
            </div>
          )}
        </div>
        <p className="text-[11px] text-[color:var(--faint)] mt-2">
          {catchment
            ? "Communities assigned to this FQHC by straight-line distance (city centroid). Rate = flagged ÷ adults."
            : "Communities with ≥ 3 adults. Rate = flagged ÷ adults evaluated."}
        </p>
      </div>
    </div>
  );
}

function CatchStat({ value, label, suffix, accent }: { value: number; label: string; suffix?: string; accent?: boolean }) {
  return (
    <div className="surface px-3 py-2.5">
      <div className={`mono text-[20px] font-semibold tabular-nums leading-none ${accent ? "text-[color:var(--accent-ink)]" : "text-[color:var(--ink)]"}`}>
        {value.toLocaleString()}{suffix}
      </div>
      <div className="text-[10.5px] text-[color:var(--muted)] mt-1.5 leading-tight">{label}</div>
    </div>
  );
}
