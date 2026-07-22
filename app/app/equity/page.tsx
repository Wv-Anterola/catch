import { getEquity } from "@/lib/data";

function pct(n: number, d: number) {
  return d ? `${Math.round((1000 * n) / d) / 10}%` : "n/a";
}

export default function EquityPage() {
  const equity = getEquity();
  const overall = equity.rows.find((row) => row.dimension === "overall");
  const groups = equity.rows.filter((row) => row.dimension !== "overall");

  return (
    <main className="mx-auto max-w-[1240px] px-4 sm:px-6 py-8">
      <div className="max-w-3xl mb-7">
        <p className="eyebrow mb-2">Aggregate audit</p>
        <h1 className="text-[24px] font-semibold tracking-tight">Equity & access</h1>
        <p className="text-[14px] text-[color:var(--muted)] mt-2">
          This view monitors where documentation and outreach support are needed. It does not alter
          clinical priority, and race and ethnicity are never included in the patient queue or detail view.
        </p>
      </div>

      {overall && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <Metric label="Adults analyzed" value={overall.adults.toLocaleString()} />
          <Metric label="Care gaps flagged" value={`${overall.flagged.toLocaleString()} · ${pct(overall.flagged, overall.adults)}`} />
          <Metric label="Documented support need" value={`${overall.support_need.toLocaleString()} · ${pct(overall.support_need, overall.adults)}`} />
        </div>
      )}

      <section className="surface overflow-hidden">
        <div className="px-4 py-3 border-b border-[color:var(--border)]">
          <h2 className="text-[15px] font-semibold">Access signals by recorded group</h2>
          <p className="text-[12px] text-[color:var(--muted)] mt-0.5">
            Percentages are the share of adults analyzed in each group. Groups with fewer than{" "}
            {equity.suppression_min_n} adults are suppressed. Missing documentation is not treated as no need.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[color:var(--panel)] text-[11px] uppercase tracking-wide text-[color:var(--muted)]">
              <tr><th className="px-4 py-2">Group</th><th className="px-3 py-2">Adults</th><th className="px-3 py-2">Flagged</th><th className="px-3 py-2">Support need</th><th className="px-3 py-2">Language</th><th className="px-3 py-2">Food</th><th className="px-3 py-2">Transport</th></tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {groups.map((row) => (
                <tr key={`${row.dimension}-${row.group_name}`}>
                  <td className="px-4 py-3"><span className="capitalize text-[color:var(--muted)]">{row.dimension}</span><br /><span className="font-medium">{row.group_name}</span></td>
                  <td className="px-3 py-3 tabular-nums">{row.adults.toLocaleString()}</td>
                  <td className="px-3 py-3 tabular-nums">{pct(row.flagged, row.adults)}</td>
                  <td className="px-3 py-3 tabular-nums">{pct(row.support_need, row.adults)}</td>
                  <td className="px-3 py-3 tabular-nums">{pct(row.language_support, row.adults)}</td>
                  <td className="px-3 py-3 tabular-nums">{pct(row.food_need, row.adults)}</td>
                  <td className="px-3 py-3 tabular-nums">{pct(row.transport_need, row.adults)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="surface px-4 py-4"><p className="eyebrow">{label}</p><p className="text-[20px] font-semibold mt-1">{value}</p></div>;
}
