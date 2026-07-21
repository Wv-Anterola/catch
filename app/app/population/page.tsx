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
      <h1 className="text-[20px] font-semibold tracking-tight">Population view</h1>
      <p className="text-[13px] text-[color:var(--muted)] mt-1">
        Where potential care gaps concentrate across {cities.length} communities and{" "}
        {counts.total_patients.toLocaleString()} synthetic records.
      </p>

      {/* funnel */}
      <section className="mt-7">
        <h2 className="text-[13px] font-semibold mb-3">Review funnel</h2>
        <div className="space-y-2.5 max-w-[720px]">
          {funnel.map((f) => (
            <div key={f.stage} className="flex items-center gap-3">
              <div className="w-52 text-[13px] shrink-0">{f.stage}</div>
              <div className="flex-1 h-6 rounded-[var(--r-sm)] bg-[color:var(--panel)] overflow-hidden border border-[color:var(--border)]">
                <div
                  className="h-full flex items-center px-2 text-white text-[12px] font-medium tabular-nums"
                  style={{
                    width: `${Math.max((f.n / maxN) * 100, 8)}%`,
                    background: f.ord >= 2 ? "var(--urgent)" : "var(--accent)",
                  }}
                >
                  {f.n.toLocaleString()}
                </div>
              </div>
              <div className="w-12 text-right text-[12px] text-[color:var(--faint)] tabular-nums">
                {adults ? `${Math.round((f.n / adults) * 100)}%` : ""}
              </div>
            </div>
          ))}
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
