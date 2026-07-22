import { getCityStats, getHospitals, getManifest } from "@/lib/data";
import GeoExplorer from "@/components/GeoExplorer";

export default function PopulationPage() {
  const { funnel, counts } = getManifest();
  const cities = getCityStats();
  const hospitals = getHospitals();

  const adults = funnel[0]?.n ?? 0;
  const maxN = Math.max(...funnel.map((f) => f.n), 1);

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-8">
      <h1 className="text-[20px] font-semibold tracking-tight">Geographic summary</h1>
      <p className="text-[13px] text-[color:var(--muted)] mt-1">
        Potential care gaps across {cities.length} communities in{" "}
        {counts.total_patients.toLocaleString()} synthetic records.
      </p>

      {/* funnel */}
      <section className="mt-7">
        <div className="flex items-baseline justify-between max-w-[720px] mb-3">
          <h2 className="text-[13px] font-semibold">Review funnel</h2>
          <span className="text-[11px] text-[color:var(--faint)] tabular-nums">count · share of adults</span>
        </div>
        <div className="space-y-2 max-w-[720px]">
          {funnel.map((f) => {
            const color = f.ord === 3 ? "var(--urgent)" : f.ord === 2 ? "var(--accent)" : "var(--muted)";
            return (
              <div key={f.stage} className="flex items-center gap-3" title={`${f.stage}: ${f.n.toLocaleString()}`}>
                <div className="w-44 sm:w-48 text-[12.5px] shrink-0 text-[color:var(--ink)]">{f.stage}</div>
                <div className="flex-1 h-5 rounded-[5px] bg-[color:var(--panel)] overflow-hidden">
                  <div
                    className="h-full rounded-r-[5px]"
                    style={{ width: `${Math.max((f.n / maxN) * 100, 2)}%`, background: color }}
                  />
                </div>
                <div className="w-14 text-right text-[12.5px] font-semibold tabular-nums text-[color:var(--ink)]">
                  {f.n.toLocaleString()}
                </div>
                <div className="w-10 text-right text-[11px] text-[color:var(--faint)] tabular-nums">
                  {adults ? `${Math.round((f.n / adults) * 100)}%` : ""}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-[color:var(--muted)] max-w-[720px]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-[3px]" style={{ background: "var(--muted)" }} /> screening
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-[3px]" style={{ background: "var(--accent)" }} /> undiagnosed gap
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-[3px]" style={{ background: "var(--urgent)" }} /> treated, uncontrolled
          </span>
        </div>
      </section>

      {/* geography: interactive map + ranked list with shared hover */}
      <section className="mt-9">
        <GeoExplorer cities={cities} hospitals={hospitals} />
      </section>

      <p className="mt-8 text-[12px] text-[color:var(--faint)]">
        Synthetic data: this shows the method, not a real Rhode Island prevalence rate.
      </p>
    </div>
  );
}
