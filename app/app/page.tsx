import Link from "next/link";
import { getManifest } from "@/lib/data";

function n(v: string | number | undefined) {
  return Number(v ?? 0).toLocaleString();
}

export default function OverviewPage() {
  const { counts, funnel } = getManifest();

  const adults = counts.adults;
  const flagged = counts.flagged;
  const undiagnosed = counts.undiagnosed;
  const treated = counts.treated_uncontrolled;
  const repeated = funnel.find((f) => f.stage.startsWith("2+"))?.n ?? 0;
  const prio = { urgent: counts.urgent, high: counts.high, routine: counts.routine };

  return (
    <div className="mx-auto max-w-[960px] px-6 py-12">
      {/* headline */}
      <p className="eyebrow mb-3">SyntheticRI · hypertension care-gap review</p>
      <h1 className="text-[26px] leading-tight font-semibold tracking-tight max-w-[36ch]">
        Hypertension follow-up overview
      </h1>
      <p className="mt-3 text-[15px] text-[color:var(--muted)] max-w-[64ch]">
        Hypertension follow-up depends on readings, diagnoses, medications, and encounters that are
        usually recorded in different places. CATCH brings that evidence together, flags synthetic
        records that match an explicit review rule, and ranks them for community-health follow-up. It
        is deterministic, not predictive: every record shows the exact reason it was flagged.
      </p>

      {/* primary metrics: a clean row on desktop, a 2x2 grid on phones */}
      <div className="mt-9 grid grid-cols-2 sm:grid-cols-4 divide-x-0 sm:divide-x divide-[color:var(--border)] border-y border-[color:var(--border)] [&>*:nth-child(odd)]:pl-0 sm:[&>*:nth-child(odd):not(:first-child)]:pl-4">
        <Metric value={n(adults)} label="Adults evaluated" />
        <Metric value={n(flagged)} label="Potential care gaps" accent />
        <Metric value={n(prio.urgent)} label="Urgent follow-ups" />
        <Metric value={`${Math.round((flagged / Math.max(adults, 1)) * 100)}%`} label="Share of adults flagged" />
      </div>

      {/* care-gap breakdown */}
      <section className="mt-10">
        <h2 className="text-[13px] font-semibold text-[color:var(--ink)] mb-3">Care-gap breakdown</h2>
        <div className="space-y-3">
          <Split
            label="Undiagnosed"
            desc="repeated elevated readings, no hypertension diagnosis on file"
            value={undiagnosed}
            total={flagged}
          />
          <Split
            label="Treated but uncontrolled"
            desc="on antihypertensive medication, still running high"
            value={treated}
            total={flagged}
          />
        </div>
        <p className="mt-3 text-[12px] text-[color:var(--faint)]">
          Funnel: {n(adults)} adults → {n(repeated)} with repeated elevated readings →{" "}
          {n(undiagnosed)} undiagnosed + {n(treated)} treated-uncontrolled.
        </p>
      </section>

      {/* primary action */}
      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Link href="/queue" className="btn btn-primary">
          Review prioritized records →
        </Link>
        <Link href="/population" className="text-[13px] text-[color:var(--accent)] hover:underline">
          Open the geographic summary
        </Link>
      </div>

      <p className="mt-12 text-[12px] text-[color:var(--faint)] max-w-[64ch]">
        SyntheticRI is synthetic data. CATCH demonstrates an auditable method for surfacing
        potential care gaps; it does not diagnose, predict, or report real Rhode Island prevalence.
        Every record is a candidate for clinical review. See{" "}
        <Link href="/methodology" className="underline hover:text-[color:var(--muted)]">Methodology</Link>.
      </p>
    </div>
  );
}

function Metric({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="px-4 py-5">
      <div className={`text-[28px] font-semibold tracking-tight ${accent ? "text-[color:var(--accent-ink)]" : "text-[color:var(--ink)]"}`}>
        {value}
      </div>
      <div className="text-[12px] text-[color:var(--muted)] mt-0.5">{label}</div>
    </div>
  );
}

function Split({ label, desc, value, total }: { label: string; desc: string; value: number; total: number }) {
  const pct = Math.round((value / Math.max(total, 1)) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[14px] font-medium text-[color:var(--ink)]">{label}</span>
          <span className="text-[12px] text-[color:var(--muted)]">: {desc}</span>
        </div>
        <div className="text-[13px] tabular-nums text-[color:var(--ink)] shrink-0">
          {value.toLocaleString()} <span className="text-[color:var(--faint)]">· {pct}%</span>
        </div>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-[color:var(--panel)] overflow-hidden">
        <div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
