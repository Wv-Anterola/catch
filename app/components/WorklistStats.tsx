import CountUp from "./CountUp";
import type { ManifestCounts } from "@/lib/types";

// The worklist command header: animated headline counts and a priority distribution
// bar, so opening CATCH reads as a clinical dashboard, not just a list.
export default function WorklistStats({ counts }: { counts: ManifestCounts }) {
  const { flagged, urgent, high, routine, undiagnosed, treated_uncontrolled: treated } = counts;
  const total = urgent + high + routine || 1;

  const seg = [
    { key: "urgent", label: "Urgent", n: urgent, color: "var(--urgent)" },
    { key: "high", label: "High", n: high, color: "var(--high)" },
    { key: "routine", label: "Routine", n: routine, color: "var(--routine)" },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Care gaps flagged" value={flagged} variant="accent" />
        <StatCard label="Urgent" value={urgent} variant="urgent" />
        <StatCard label="Undiagnosed" value={undiagnosed} variant="neutral" />
        <StatCard label="Treated, uncontrolled" value={treated} variant="neutral" />
      </div>

      {/* priority distribution */}
      <div className="mt-4 surface p-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="eyebrow">Priority mix</span>
          <span className="text-[11px] text-[color:var(--faint)] tabular-nums">{flagged.toLocaleString()} flagged</span>
        </div>
        <div className="flex h-2.5 rounded-full overflow-hidden bg-[color:var(--panel)]">
          {seg.map((s, i) => (
            <div
              key={s.key}
              style={{ width: `${(s.n / total) * 100}%`, background: s.color }}
              className={i > 0 ? "border-l-2 border-[color:var(--surface)]" : ""}
            />
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1.5 text-[12px]">
          {seg.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: s.color }} aria-hidden />
              <span className="text-[color:var(--muted)]">{s.label}</span>
              <span className="font-semibold tabular-nums text-[color:var(--ink)]">{s.n.toLocaleString()}</span>
              <span className="text-[color:var(--faint)] tabular-nums">{Math.round((s.n / total) * 100)}%</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, variant }: { label: string; value: number; variant: "accent" | "urgent" | "neutral" }) {
  const railClass = variant === "urgent" ? "stat-urgent" : variant === "neutral" ? "stat-neutral" : "";
  const numColor =
    variant === "urgent" ? "text-[color:var(--urgent)]" : variant === "accent" ? "text-[color:var(--accent-ink)]" : "text-[color:var(--ink)]";
  return (
    <div className={`surface stat ${railClass} pl-4 pr-4 py-3.5 lift`}>
      <div className={`text-[27px] font-semibold tracking-tight tabular-nums leading-none ${numColor}`}>
        <CountUp to={value} />
      </div>
      <div className="text-[11.5px] text-[color:var(--muted)] mt-1.5">{label}</div>
    </div>
  );
}
