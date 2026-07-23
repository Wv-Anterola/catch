"use client";

import CountUp from "./CountUp";
import type { ManifestCounts } from "@/lib/types";

// Interactive worklist command header. The counts and the priority-mix bar are not
// just a dashboard, they are the primary filter surface: click a tile or a segment to
// filter the list below, click again (or "Care gaps flagged") to clear.
export default function WorklistStats({
  counts,
  activePrio,
  activeCat,
  onPrio,
  onCat,
}: {
  counts: ManifestCounts;
  activePrio: string;
  activeCat: string;
  onPrio: (p: string) => void;
  onCat: (c: string) => void;
}) {
  const { flagged, urgent, high, routine, undiagnosed, treated_uncontrolled: treated } = counts;
  const total = urgent + high + routine || 1;
  const filtered = activePrio !== "all" || activeCat !== "all";

  const seg = [
    { key: "urgent", label: "Urgent", n: urgent, color: "var(--urgent)" },
    { key: "high", label: "High", n: high, color: "var(--high)" },
    { key: "routine", label: "Routine", n: routine, color: "var(--routine)" },
  ];

  const togglePrio = (val: string) => onPrio(activePrio === val ? "all" : val);
  const toggleCat = (val: string) => onCat(activeCat === val ? "all" : val);

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={filtered ? "Show all care gaps" : "Care gaps flagged"} value={flagged} variant="accent"
          onClick={() => { onPrio("all"); onCat("all"); }} />
        <StatCard label="Urgent" value={urgent} variant="urgent"
          active={activePrio === "urgent"} onClick={() => togglePrio("urgent")} />
        <StatCard label="Undiagnosed" value={undiagnosed} variant="neutral"
          active={activeCat === "undiagnosed"} onClick={() => toggleCat("undiagnosed")} />
        <StatCard label="Treated, uncontrolled" value={treated} variant="neutral"
          active={activeCat === "treated_uncontrolled"} onClick={() => toggleCat("treated_uncontrolled")} />
      </div>

      {/* priority mix doubles as a filter control */}
      <div className="mt-4 surface p-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="eyebrow">Priority mix · click to filter</span>
          <span className="text-[11px] text-[color:var(--faint)] tabular-nums">{flagged.toLocaleString()} flagged</span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-[color:var(--panel)]">
          {seg.map((s, i) => {
            const on = activePrio === s.key;
            const dim = activePrio !== "all" && !on;
            return (
              <button
                key={s.key}
                type="button"
                aria-pressed={on}
                aria-label={`Filter to ${s.label}`}
                title={`${s.label}: ${s.n.toLocaleString()} (${Math.round((s.n / total) * 100)}%)`}
                onClick={() => togglePrio(s.key)}
                style={{ width: `${(s.n / total) * 100}%`, background: s.color, opacity: dim ? 0.32 : 1 }}
                className={`h-full transition-opacity duration-300 hover:opacity-90 ${i > 0 ? "border-l-2 border-[color:var(--surface)]" : ""} ${on ? "shadow-[inset_0_0_0_2px_rgba(255,255,255,0.65)]" : ""}`}
              />
            );
          })}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1.5 text-[12px]">
          {seg.map((s) => {
            const on = activePrio === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => togglePrio(s.key)}
                aria-pressed={on}
                className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 transition-colors ${on ? "bg-[color:var(--panel)]" : "hover:bg-[color:var(--panel)]"}`}
              >
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: s.color }} aria-hidden />
                <span className={on ? "text-[color:var(--ink)] font-semibold" : "text-[color:var(--muted)]"}>{s.label}</span>
                <span className="font-semibold tabular-nums text-[color:var(--ink)]">{s.n.toLocaleString()}</span>
                <span className="text-[color:var(--faint)] tabular-nums">{Math.round((s.n / total) * 100)}%</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  variant,
  active = false,
  onClick,
}: {
  label: string;
  value: number;
  variant: "accent" | "urgent" | "neutral";
  active?: boolean;
  onClick: () => void;
}) {
  const rail = variant === "urgent" ? "stat-urgent" : variant === "neutral" ? "stat-neutral" : "";
  const numColor =
    variant === "urgent" ? "text-[color:var(--urgent)]" : variant === "accent" ? "text-[color:var(--accent-ink)]" : "text-[color:var(--ink)]";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`surface stat ${rail} text-left pl-4 pr-4 py-3.5 lift ${active ? "shadow-[inset_0_0_0_2px_var(--accent)]" : ""}`}
    >
      <div className={`mono text-[28px] font-semibold tracking-[-0.02em] tabular-nums leading-none ${numColor}`}>
        <CountUp to={value} />
      </div>
      <div className="text-[11.5px] text-[color:var(--muted)] mt-2">{label}</div>
    </button>
  );
}
