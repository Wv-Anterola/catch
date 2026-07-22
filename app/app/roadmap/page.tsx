export default function RoadmapPage() {
  return (
    <main className="mx-auto max-w-[920px] px-4 sm:px-6 py-8">
      <p className="eyebrow mb-2">Future implementation context</p>
      <h1 className="text-[24px] font-semibold tracking-tight">Opportunity roadmap</h1>
      <p className="text-[14px] text-[color:var(--muted)] mt-2 max-w-3xl">
        CATCH is a synthetic-data prototype, not an active clinical deployment. These public initiatives
        identify where a governed pilot could be relevant; they are not endorsements, integrations, or commitments.
      </p>
      <div className="mt-7 space-y-4">
        <Card title="Rural health transformation">
          Rhode Island&apos;s Rural Health Transformation Program identifies primary care, health IT, telehealth,
          and coordinated community care as investment areas across 18 rural towns. CATCH&apos;s next step would be a
          locally validated access workflow, not a rural risk boost.
          <Source href="https://eohhs.ri.gov/initiatives/rural-health-transformation-program">State program details</Source>
        </Card>
        <Card title="Value-based primary care context">
          Rhode Island is a Cohort 3 participant in CMS&apos;s AHEAD model. A future pilot should measure care-gap review,
          closed-loop referral, and access outcomes before making cost or efficiency claims.
          <Source href="https://www.cms.gov/priorities/innovation/innovation-models/ahead">CMS AHEAD model</Source>
        </Card>
        <Card title="Potential EHR discovery partner">
          Providence Community Health Centers announced its Epic go-live in 2023. Any CATCH integration would require
          a separate partner agreement, clinical governance, security review, and validated real-data workflow.
          <Source href="https://www.providencechc.org/about/news-events/pchc-first-community-health-center-in-ri-to-adopt-epic-electronic-health-record/">PCHC announcement</Source>
        </Card>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="surface p-5 lift"><h2 className="text-[16px] font-semibold">{title}</h2><div className="text-[13px] leading-6 text-[color:var(--muted)] mt-2">{children}</div></section>;
}

function Source({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer" className="block text-[12px] text-[color:var(--accent)] hover:underline mt-2">{children} ↗</a>;
}
