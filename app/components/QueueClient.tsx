"use client";

import { useMemo, useState } from "react";
import type { QueueRow, FunnelStage, Priority } from "@/lib/types";
import { useContacted } from "@/lib/contacted";
import PatientDrawer from "./PatientDrawer";

const RENDER_CAP = 200;

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
}: {
  cohort: QueueRow[];
  funnel: FunnelStage[];
  totalFlagged?: number;
  version: string;
}) {
  const [prio, setPrio] = useState("all");
  const [cat, setCat] = useState("all");
  const [city, setCity] = useState("all");
  const [q, setQ] = useState("");
  const [hideContacted, setHideContacted] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  // Contacted marks persist in the browser (localStorage), namespaced by dataset version,
  // and survive refresh. Empty on the server render so hydration matches.
  const { contacted, toggle: toggleContacted, reset: resetContacted } = useContacted(version);

  const cities = useMemo(
    () => Array.from(new Set(cohort.map((c) => c.city).filter(Boolean))).sort(),
    [cohort]
  );
  const filtersActive = prio !== "all" || cat !== "all" || city !== "all" || q !== "" || hideContacted;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return cohort.filter((c) => {
      if (prio !== "all" && c.priority !== prio) return false;
      if (cat !== "all" && c.category !== cat) return false;
      if (city !== "all" && c.city !== city) return false;
      if (hideContacted && contacted.has(c.patient_id)) return false;
      if (needle) {
        const hay = `${c.city} ${c.reason} ${c.comorbid_tags} ${c.patient_id}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [cohort, prio, cat, city, q, hideContacted, contacted]);

  const undiag = funnel.find((f) => f.stage.startsWith("Undiagnosed"))?.n ?? 0;
  const treated = funnel.find((f) => f.stage.startsWith("Treated"))?.n ?? 0;
  const urgent = cohort.filter((c) => c.priority === "urgent").length;

  function resetFilters() {
    setPrio("all"); setCat("all"); setCity("all"); setQ(""); setHideContacted(false);
  }

  return (
    <div>
      {/* title + one quiet summary line, no card wall */}
      <div className="mb-5">
        <h1 className="text-[20px] font-semibold tracking-tight">Outreach queue</h1>
        <p className="text-[13px] text-[color:var(--muted)] mt-1">
          {(totalFlagged ?? cohort.length).toLocaleString()} adults match an explicit care-gap rule
          · {undiag.toLocaleString()} undiagnosed · {treated.toLocaleString()} treated-uncontrolled
          · {urgent.toLocaleString()} urgent in view
        </p>
      </div>

      {/* filters: compact, resettable */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search city, reason, risk…"
          aria-label="Search queue"
          className="field flex-1 min-w-[180px]"
        />
        <Select value={prio} onChange={setPrio} label="Priority"
          options={[["all", "All priorities"], ["urgent", "Urgent"], ["high", "High"], ["routine", "Routine"]]} />
        <Select value={cat} onChange={setCat} label="Category"
          options={[["all", "All categories"], ["undiagnosed", "Undiagnosed"], ["treated_uncontrolled", "Treated · uncontrolled"]]} />
        <Select value={city} onChange={setCity} label="City"
          options={[["all", "All cities"], ...cities.map((c) => [c, c] as [string, string])]} />
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(360px,440px)] gap-5 items-start">
        {/* queue list */}
        <div className="surface overflow-hidden">
          <div className="flex items-center justify-between px-4 h-9 border-b border-[color:var(--border)] bg-[color:var(--panel)]">
            <span className="eyebrow">Patient · why flagged</span>
            <span className="text-[12px] text-[color:var(--muted)] tabular-nums">
              {rows.length.toLocaleString()}
              {totalFlagged && totalFlagged > cohort.length ? ` of ${totalFlagged.toLocaleString()}` : ""}
            </span>
          </div>

          <ul className="max-h-[72vh] overflow-y-auto divide-y divide-[color:var(--border)]">
            {rows.slice(0, RENDER_CAP).map((c) => {
              const isC = contacted.has(c.patient_id);
              const isSel = selected === c.patient_id;
              const border =
                c.priority === "urgent" ? "var(--urgent)" : c.priority === "high" ? "var(--high)" : "var(--routine)";
              return (
                <li key={c.patient_id}>
                  <button
                    onClick={() => setSelected(c.patient_id)}
                    aria-pressed={isSel}
                    style={{ borderLeftColor: isSel ? "var(--accent)" : border }}
                    className={`w-full text-left flex gap-3 pl-3 pr-4 py-3 border-l-[3px] transition-colors ${
                      isSel ? "bg-[color:var(--accent-weak)]" : "hover:bg-[color:var(--panel)]"
                    }`}
                  >
                    <span className={`dot mt-1.5 dot-${c.priority}`} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-[14px]">Patient {c.patient_id.slice(0, 8)}</span>
                        <span className="text-[12px] text-[color:var(--muted)]">{CAT_LABEL[c.category] ?? c.category}</span>
                        <span className={`prio-label prio-${c.priority}`}>· {PRIO_LABEL[c.priority]}</span>
                      </span>
                      <span className="block text-[13px] text-[color:var(--muted)] mt-0.5 truncate">
                        {c.reason}
                        {c.stacked > 0 ? ` · ${c.stacked} risk factor${c.stacked > 1 ? "s" : ""}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[12px] text-[color:var(--muted)]">
                        {c.city}
                      </span>
                      <span className="block text-[12px] mt-0.5">
                        {isC ? (
                          <span className="prio-routine font-medium">✓ Contacted</span>
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
                No patients match these filters.
                {filtersActive && (
                  <button onClick={resetFilters} className="ml-1 text-[color:var(--accent)] hover:underline">Reset</button>
                )}
              </li>
            )}
            {rows.length > RENDER_CAP && (
              <li className="px-4 py-2.5 text-center text-[12px] text-[color:var(--faint)] bg-[color:var(--panel)]">
                Showing the top {RENDER_CAP} by priority; narrow the filters to see more.
              </li>
            )}
          </ul>
        </div>

        {/* detail */}
        <div className="lg:sticky lg:top-[76px]">
          <PatientDrawer
            key={selected ?? "none"}
            patientId={selected}
            contacted={selected ? contacted.has(selected) : false}
            onToggleContacted={toggleContacted}
          />
        </div>
      </div>
    </div>
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
