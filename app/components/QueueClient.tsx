"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { QueueRow, FunnelStage, Priority, ManifestCounts } from "@/lib/types";
import { useContacted } from "@/lib/contacted";
import { haversineKm, type FqhcSite, type CatchmentStat } from "@/lib/fqhc";
import PatientDrawer from "./PatientDrawer";
import WorklistStats from "./WorklistStats";
import CountUp from "./CountUp";

const RENDER_CAP = 200;

// Base sorts always available. Distance sorts are appended only when the page
// supplies a city→FQHC distance map (home + queue pages do). When a specific site is
// selected, the distance sorts measure to THAT site (see distanceLabel).
const BASE_SORTS: [string, string][] = [
  ["priority", "Priority (default)"],
  ["risk", "Most risk factors"],
  ["young", "Youngest first"],
  ["old", "Oldest first"],
];

const KM_PER_MILE = 1.60934;

const PRIO_LABEL: Record<Priority, string> = { urgent: "Urgent", high: "High", routine: "Routine" };
const CAT_LABEL: Record<string, string> = {
  undiagnosed: "Undiagnosed",
  treated_uncontrolled: "Treated · uncontrolled",
};

export default function QueueClient({
  cohort,
  funnel,
  totalFlagged,
  version,
  counts,
  cityDistanceKm,
  cityToSite,
  cityCoords,
  siteCatchment,
  fqhcSites,
  heading = "Outreach queue",
  lead,
  showHeader = true,
}: {
  cohort: QueueRow[];
  funnel: FunnelStage[];
  totalFlagged?: number;
  version: string;
  counts?: ManifestCounts;
  // city → straight-line km to the nearest RI FQHC (see lib/fqhc.ts). Enables the
  // distance sorts and the per-row distance readout. Omitted = distance sorts hidden.
  cityDistanceKm?: Record<string, number>;
  // city → index (into fqhcSites) of the specific FQHC SITE nearest to it. Powers the
  // "my site" workspace filter. Omitted = FQHC filter hidden.
  cityToSite?: Record<string, number>;
  // city → { lat, lon }, so distances can be measured to the specific chosen site.
  cityCoords?: Record<string, { lat: number; lon: number }>;
  // true catchment totals per site (index → stats), from the full population.
  siteCatchment?: Record<number, CatchmentStat>;
  // every selectable FQHC site, grouped by organization in the picker.
  fqhcSites?: FqhcSite[];
  heading?: string;
  lead?: ReactNode;
  showHeader?: boolean;
}) {
  const [prio, setPrio] = useState("all");
  const [cat, setCat] = useState("all");
  const [city, setCity] = useState("all");
  const [support, setSupport] = useState("all");
  const [role, setRole] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("priority");
  const [hideContacted, setHideContacted] = useState(false);
  const [fqhc, setFqhc] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  // Contacted marks persist in the browser (localStorage), namespaced by dataset version,
  // and survive refresh. Empty on the server render so hydration matches.
  const { contacted, toggle: toggleContacted, reset: resetContacted } = useContacted(version);

  // FQHC workspace: the CATCH user works at one specific health-center site. Selecting
  // that site scopes the worklist to the patients it is the nearest FQHC for and sorts
  // them by distance to that site. This is context, not a filter: it survives a reset
  // of the filter controls below.
  const hasFqhc = !!cityToSite && !!fqhcSites && fqhcSites.length > 0;
  const siteIdx = fqhc === "all" ? null : Number(fqhc);
  const selectedSite = siteIdx != null ? fqhcSites?.[siteIdx] : undefined;
  const siteOf = (c: QueueRow): number | undefined => cityToSite?.[c.city];
  const inCatchment = (c: QueueRow) => siteIdx == null || siteOf(c) === siteIdx;

  // Straight-line km from a patient's city to the SELECTED site (undefined when no site
  // is picked or the city has no coordinates). This is what the distance sorts and the
  // per-row readout use once a site is chosen.
  const kmToSelectedSite = (cityName: string): number | undefined => {
    if (!selectedSite) return undefined;
    const co = cityCoords?.[cityName];
    if (!co) return undefined;
    return haversineKm(co.lat, co.lon, selectedSite.lat, selectedSite.lon);
  };

  // The cohort this site is responsible for (before the filter controls). Drives the
  // City options and the language lens so every number in view agrees with the worklist.
  const catchmentCohort = useMemo(
    () => (siteIdx == null ? cohort : cohort.filter((c) => siteOf(c) === siteIdx)),
    [cohort, siteIdx, cityToSite],
  );

  // City options track the selected site: once you pick it, the City filter offers only
  // the communities in your catchment.
  const cities = useMemo(
    () => Array.from(new Set(catchmentCohort.map((c) => c.city).filter(Boolean))).sort(),
    [catchmentCohort]
  );
  // Access-based community lens: patients flagged for language/interpreter support (a
  // proxy for LEP outreach, not a protected attribute). Never a race/ethnicity filter.
  const languageCount = useMemo(
    () => catchmentCohort.filter((c) => (c.support_flags ?? "").split(",").includes("language")).length,
    [catchmentCohort]
  );
  const filtersActive = prio !== "all" || cat !== "all" || city !== "all" || support !== "all" || role !== "all" || q !== "" || hideContacted;

  // The site's TRUE catchment totals, from the full flagged population (not the capped
  // worklist). This is the honest "how many people my site serves" headline.
  const catchment: CatchmentStat | undefined = siteIdx != null ? siteCatchment?.[siteIdx] : undefined;

  // Sites grouped by organization, so multi-site orgs (e.g. Blackstone Valley: Pawtucket
  // and Central Falls) appear as separate, selectable locations under one heading.
  const siteGroups = useMemo(() => {
    const groups: { org: string; sites: { idx: number; city: string }[] }[] = [];
    (fqhcSites ?? []).forEach((s, idx) => {
      let g = groups.find((x) => x.org === s.org);
      if (!g) { g = { org: s.org, sites: [] }; groups.push(g); }
      g.sites.push({ idx, city: s.city });
    });
    return groups;
  }, [fqhcSites]);

  // Sort dropdown: label the distance sorts by whether a specific site is chosen.
  const distanceLabel = selectedSite
    ? [["near", `Nearest to my site (${selectedSite.city})`], ["far", `Farthest from my site (${selectedSite.city})`]] as [string, string][]
    : [["far", "Farthest from an FQHC"], ["near", "Nearest to an FQHC"]] as [string, string][];
  const hasDistance = !!cityDistanceKm && Object.keys(cityDistanceKm).length > 0;
  const sortOptions = useMemo<[string, string][]>(
    () => (hasDistance ? [...BASE_SORTS.slice(0, 1), ...distanceLabel, ...BASE_SORTS.slice(1)] : BASE_SORTS),
    [hasDistance, selectedSite],
  );
  const distanceActive = sort === "far" || sort === "near";
  // Distance used by the sorts + row readout: to the selected site if one is chosen,
  // otherwise to the nearest FQHC (statewide view).
  const kmFor = (cityName: string): number | undefined =>
    selectedSite ? kmToSelectedSite(cityName) : cityDistanceKm?.[cityName];

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = cohort.filter((c) => {
      if (!inCatchment(c)) return false;
      if (prio !== "all" && c.priority !== prio) return false;
      if (cat !== "all" && c.category !== cat) return false;
      if (city !== "all" && c.city !== city) return false;
      const flags = c.support_flags ? c.support_flags.split(",") : [];
      if (support !== "all" && !flags.includes(support)) return false;
      const roles = c.recommended_roles ? c.recommended_roles.split(",") : [];
      if (role !== "all" && !roles.includes(role)) return false;
      if (hideContacted && contacted.has(c.patient_id)) return false;
      if (needle) {
        const hay = `${c.city} ${c.reason} ${c.comorbid_tags} ${c.patient_id}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });

    // "priority" keeps the incoming order (the cohort ships pre-ranked). Every other
    // sort is a stable reorder of the filtered set, so ties preserve priority order.
    // Distance is to the selected site if one is chosen, else to the nearest FQHC.
    // Unknown distances (cities without coordinates) always sort to the bottom.
    const km = (c: QueueRow) => kmFor(c.city);
    switch (sort) {
      case "risk":
        return [...filtered].sort((a, b) => b.stacked - a.stacked);
      case "young":
        return [...filtered].sort((a, b) => a.age - b.age);
      case "old":
        return [...filtered].sort((a, b) => b.age - a.age);
      case "far":
        return [...filtered].sort((a, b) => (km(b) ?? -1) - (km(a) ?? -1));
      case "near":
        return [...filtered].sort((a, b) => (km(a) ?? Infinity) - (km(b) ?? Infinity));
      default:
        return filtered;
    }
  }, [cohort, fqhc, cityToSite, selectedSite, prio, cat, city, support, role, q, hideContacted, contacted, sort, cityDistanceKm, cityCoords]);

  // Remounting the list on a discrete filter/sort/site change replays the row cascade,
  // so every interaction feels like the worklist re-dealing. Search text (q) is excluded
  // so it does not re-animate on each keystroke.
  const cascadeKey = [fqhc, sort, prio, cat, city, support, role, hideContacted].join("|");

  const undiag = funnel.find((f) => f.stage.startsWith("Undiagnosed"))?.n ?? 0;
  const treated = funnel.find((f) => f.stage.startsWith("Treated"))?.n ?? 0;
  const urgent = cohort.filter((c) => c.priority === "urgent").length;

  function resetFilters() {
    setPrio("all"); setCat("all"); setCity("all"); setSupport("all"); setRole("all"); setQ(""); setHideContacted(false);
  }

  // Switching site is a context change: clear the City filter (its options change with
  // the catchment) but leave priority/category/etc. so a worker keeps their focus.
  // Picking a specific site sorts by nearest to it (the worker's own travel radius);
  // returning to statewide restores the default priority order.
  function pickFqhc(next: string) {
    setFqhc(next);
    setCity("all");
    setSelected(null);
    if (next === "all") {
      if (sort === "near" || sort === "far") setSort("priority");
    } else {
      setSort("near");
    }
  }

  return (
    <div>
      {showHeader && (
        <div className="mb-5">
          <h1 className="text-[21px] font-semibold tracking-tight">{heading}</h1>
          {lead && <p className="text-[13.5px] text-[color:var(--muted)] mt-1.5 max-w-[84ch] leading-[1.55]">{lead}</p>}
          <p className="text-[13px] text-[color:var(--muted)] mt-1.5">
            <span className="font-semibold text-[color:var(--ink)] tabular-nums">{(totalFlagged ?? cohort.length).toLocaleString()}</span> adults match an explicit care-gap rule
            · {undiag.toLocaleString()} undiagnosed · {treated.toLocaleString()} treated-uncontrolled
            · {urgent.toLocaleString()} urgent in view
          </p>
        </div>
      )}

      {/* FQHC workspace context: CATCH is used by staff at ONE specific site, so the
          first choice is "where do I work?" Picking a site scopes the worklist to the
          patients it is the nearest FQHC for and sorts them by distance to that site. */}
      {hasFqhc && (
        <div className="surface mb-5 border-l-[3px] border-l-[color:var(--accent)] px-4 py-3.5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            <div className="flex items-center gap-3 shrink-0">
              <span className="pulse-dot inline-block w-[8px] h-[8px] text-[color:var(--accent)] shrink-0" aria-hidden>
                <span className="pulse-core beat" />
              </span>
              <div>
                <label htmlFor="fqhc-workspace" className="eyebrow block mb-1">Where you work</label>
                <select
                  id="fqhc-workspace"
                  value={fqhc}
                  onChange={(e) => pickFqhc(e.target.value)}
                  className="field w-full sm:w-[340px] font-medium"
                >
                  <option value="all">All health centers (statewide)</option>
                  {siteGroups.map((g) => (
                    <optgroup key={g.org} label={g.org}>
                      {g.sites.map((s) => (
                        <option key={s.idx} value={s.idx}>{s.city}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            {selectedSite && catchment ? (
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="text-[13px] font-semibold text-[color:var(--ink)]">
                    {selectedSite.org} <span className="text-[color:var(--muted)] font-normal">· {selectedSite.city}</span>
                  </span>
                  <button type="button" onClick={() => pickFqhc("all")} className="text-[12px] text-[color:var(--accent)] hover:underline">
                    View all centers
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
                  <CatchMini n={catchment.flagged} label="flagged adults" accent />
                  <CatchMini n={catchment.undiagnosed} label="undiagnosed" />
                  <CatchMini n={catchment.treated_uncontrolled} label="treated, uncontrolled" />
                  <CatchMini n={catchment.communities} label={catchment.communities === 1 ? "community" : "communities"} />
                </div>
                <p className="text-[11px] text-[color:var(--faint)] mt-1.5 leading-snug">
                  Patients whose community is closest to your {selectedSite.city} site by straight-line
                  distance, sorted nearest first. The worklist below shows the top-priority names to work now.
                </p>
              </div>
            ) : (
              <p className="text-[12.5px] text-[color:var(--muted)] leading-[1.5] lg:text-right lg:max-w-[44ch]">
                Pick your site to focus the worklist on the patients it is the nearest FQHC for, sorted
                by distance to your door.
              </p>
            )}
          </div>
        </div>
      )}

      {/* command header: the count tiles and priority-mix bar double as the primary
          filter surface, wired to this component's own prio/category state. Shown in the
          statewide view; when a site is selected, its true catchment totals live in the
          workspace bar above and the tiles would only repeat the program-wide numbers. */}
      {counts && fqhc === "all" && (
        <div className="mb-6">
          <WorklistStats
            counts={counts}
            activePrio={prio}
            activeCat={cat}
            onPrio={setPrio}
            onCat={setCat}
          />
        </div>
      )}

      {/* community lens: an access-based, one-click view of patients needing language
          support (LEP proxy), routed to bilingual community health workers. Honest by
          design: it filters on documented interpreter need, never on race or ethnicity. */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[12px] font-medium text-[color:var(--muted)]">Community lens:</span>
        <button
          type="button"
          onClick={() => setSupport(support === "language" ? "all" : "language")}
          aria-pressed={support === "language"}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors ${
            support === "language"
              ? "border-[color:var(--accent)] bg-[color:var(--accent-weak)] text-[color:var(--accent-ink)]"
              : "border-[color:var(--border-strong)] text-[color:var(--muted)] hover:bg-[color:var(--panel)]"
          }`}
        >
          Language access
          <span className="tabular-nums font-semibold text-[color:var(--accent)]">{languageCount.toLocaleString()}</span>
        </button>
        <span className="text-[11px] text-[color:var(--faint)]">
          patients flagged for interpreter support → routed to bilingual community health workers
        </span>
      </div>

      {/* filters: compact, resettable; search takes its own row on phones */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by city, reason, or ID…"
          aria-label="Search queue"
          className="field w-full sm:flex-1 sm:min-w-[180px]"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select value={prio} onChange={setPrio} label="Priority"
            options={[["all", "All priorities"], ["urgent", "Urgent"], ["high", "High"], ["routine", "Routine"]]} />
          <Select value={cat} onChange={setCat} label="Category"
            options={[["all", "All categories"], ["undiagnosed", "Undiagnosed"], ["treated_uncontrolled", "Treated · uncontrolled"]]} />
          <Select value={city} onChange={setCity} label="City"
            options={[["all", "All cities"], ...cities.map((c) => [c, c] as [string, string])]} />
          <Select value={support} onChange={setSupport} label="Outreach need"
            options={[["all", "All outreach needs"], ["language", "Language support"], ["food", "Food access"], ["transportation", "Transportation"], ["insurance", "Insurance"], ["pcp", "PCP continuity"]]} />
          <Select value={role} onChange={setRole} label="Recommended role"
            options={[["all", "All recommended roles"], ["Community health worker", "Community health worker"], ["Care coordinator", "Care coordinator"], ["Pharmacist", "Pharmacist"], ["Clinical reviewer", "Clinical reviewer"]]} />
          <label className="flex items-center gap-1.5 text-[13px] text-[color:var(--muted)]">
            <span className="text-[color:var(--faint)]">Sort</span>
            <Select value={sort} onChange={setSort} label="Sort worklist" options={sortOptions} />
          </label>
          <label className="flex items-center gap-1.5 text-[13px] text-[color:var(--muted)] px-1 cursor-pointer select-none">
            <input type="checkbox" checked={hideContacted} onChange={(e) => setHideContacted(e.target.checked)} />
            Hide contacted
          </label>
          {filtersActive && (
            <button onClick={resetFilters} className="text-[13px] text-[color:var(--accent)] hover:underline px-1">
              Reset filters
            </button>
          )}
          {contacted.size > 0 && (
            <button
              onClick={resetContacted}
              title="Clear the demo's contacted marks (saved in this browser only)"
              className="text-[13px] text-[color:var(--muted)] hover:text-[color:var(--ink)] hover:underline px-1"
            >
              Reset contacted ({contacted.size})
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(360px,440px)] gap-5 items-start">
        {/* queue list */}
        <div className="surface overflow-hidden">
          <div className="flex items-center justify-between px-4 h-9 border-b border-[color:var(--border)] bg-[color:var(--panel)]">
            <span className="eyebrow">Patient · reason for review</span>
            <span className="text-[12px] text-[color:var(--muted)] tabular-nums">
              {rows.length.toLocaleString()}
              {catchment
                ? ` of ${catchment.flagged.toLocaleString()} in catchment`
                : totalFlagged && totalFlagged > cohort.length ? ` of ${totalFlagged.toLocaleString()}` : ""}
            </span>
          </div>

          <ul key={cascadeKey} className="max-h-[72vh] overflow-y-auto divide-y divide-[color:var(--border)]">
            {rows.slice(0, RENDER_CAP).map((c, i) => {
              const isC = contacted.has(c.patient_id);
              const isSel = selected === c.patient_id;
              const border =
                c.priority === "urgent" ? "var(--urgent)" : c.priority === "high" ? "var(--high)" : "var(--routine)";
              return (
                <li key={c.patient_id} className="q-row" style={{ animationDelay: `${Math.min(i, 16) * 24}ms` }}>
                  <button
                    onClick={() => setSelected(c.patient_id)}
                    aria-pressed={isSel}
                    style={{ borderLeftColor: isSel ? "var(--accent)" : isC ? "var(--routine)" : border }}
                    className={`q-row-btn group w-full text-left flex gap-3 pl-3.5 pr-4 py-3 border-l-[3px] ${
                      isSel
                        ? "bg-[color:var(--accent-weak)]"
                        : isC
                          ? "bg-[color:var(--routine-weak)] hover:bg-[color:var(--panel)]"
                          : "hover:bg-[color:var(--panel)] hover:shadow-[inset_0_0_0_1px_var(--border)]"
                    }`}
                  >
                    <span className={`min-w-0 flex-1 ${isC ? "opacity-55" : ""}`}>
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold text-[14px] ${isC ? "line-through decoration-2 decoration-[color:var(--routine)]" : ""}`}>Patient <span className="mono font-medium text-[13px]">{c.patient_id.slice(0, 8)}</span></span>
                        <span className={`prio-pill prio-pill-${c.priority}`} style={isC ? { opacity: 0.5 } : undefined}>{PRIO_LABEL[c.priority]}</span>
                        <span className="text-[12px] text-[color:var(--muted)]">{CAT_LABEL[c.category] ?? c.category}</span>
                      </span>
                      <span className={`block text-[13px] text-[color:var(--muted)] mt-0.5 truncate ${isC ? "line-through decoration-[color:var(--routine)]" : ""}`}>
                        {c.reason}
                        {c.stacked > 0 ? ` · ${c.stacked} risk factor${c.stacked > 1 ? "s" : ""}` : ""}
                      </span>
                      {c.support_flags && (
                        <span className="block text-[11px] text-[color:var(--accent)] mt-1">
                          Outreach: {c.support_flags.split(",").join(" · ")}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[12px] text-[color:var(--muted)]">
                        {c.city}
                      </span>
                      {distanceActive && kmFor(c.city) != null && (
                        <span
                          className="block mono text-[11px] text-[color:var(--accent)] mt-0.5"
                          title={selectedSite ? `Straight-line distance from ${c.city} to your ${selectedSite.city} site` : "Straight-line distance from the city to the nearest RI FQHC"}
                        >
                          {(() => { const mi = kmFor(c.city)! / KM_PER_MILE; return mi < 10 ? mi.toFixed(1) : Math.round(mi).toString(); })()} mi {selectedSite ? "to your site" : "to FQHC"}
                        </span>
                      )}
                      <span className="block text-[12px] mt-0.5">
                        {isC ? (
                          <span className="prio-routine font-medium">Contacted</span>
                        ) : (
                          <span className="text-[color:var(--faint)]">age {Math.round(c.age)}</span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {rows.length === 0 && (
              <li className="px-4 py-12 text-center text-[13px] text-[color:var(--muted)]">
                {selectedSite && !filtersActive ? (
                  <>
                    No flagged patients are in the top worklist for the {selectedSite.city} site right now.
                    <button onClick={() => pickFqhc("all")} className="ml-1 text-[color:var(--accent)] hover:underline">View all centers</button>
                  </>
                ) : (
                  <>
                    No records match these filters.
                    {filtersActive && (
                      <button onClick={resetFilters} className="ml-1 text-[color:var(--accent)] hover:underline">Clear filters</button>
                    )}
                  </>
                )}
              </li>
            )}
            {rows.length > RENDER_CAP && (
              <li className="px-4 py-2.5 text-center text-[12px] text-[color:var(--faint)] bg-[color:var(--panel)]">
                Showing the top {RENDER_CAP} in the current sort; narrow the filters to see more.
              </li>
            )}
          </ul>
        </div>

        {/* detail: sticky side panel on desktop / tablet-wide (lg+) */}
        <div className="hidden lg:block lg:sticky lg:top-[76px]">
          <PatientDrawer
            key={selected ?? "none"}
            patientId={selected}
            contacted={selected ? contacted.has(selected) : false}
            onToggleContacted={toggleContacted}
          />
        </div>
      </div>

      {/* detail: bottom sheet on phones / narrow tablets (< lg) */}
      {selected && (
        <div className="lg:hidden" role="dialog" aria-modal="true" aria-label="Patient detail">
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setSelected(null)}
            aria-hidden
          />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-[16px] bg-[color:var(--surface)] shadow-[0_-4px_28px_rgba(16,24,40,0.20)]">
            <PatientDrawer
              key={`sheet-${selected}`}
              patientId={selected}
              contacted={contacted.has(selected)}
              onToggleContacted={toggleContacted}
              onClose={() => setSelected(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// One true-catchment number in the workspace bar (e.g. "1,740 undiagnosed"). Counts up
// on arrival, and re-counts whenever the selected site changes (CountUp keys on `to`).
function CatchMini({ n, label, accent = false }: { n: number; label: string; accent?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 figure-pop">
      <span className={`mono text-[17px] font-semibold tabular-nums leading-none ${accent ? "text-[color:var(--accent-ink)]" : "text-[color:var(--ink)]"}`}>
        <CountUp to={n} duration={700} />
      </span>
      <span className="text-[11.5px] text-[color:var(--muted)]">{label}</span>
    </span>
  );
}

function Select({
  value, onChange, label, options,
}: {
  value: string; onChange: (v: string) => void; label: string; options: [string, string][];
}) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="field">
      {options.map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  );
}
