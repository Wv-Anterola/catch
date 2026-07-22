import Link from "next/link";
import { getManifest } from "@/lib/data";
import LanguageStudio from "@/components/LanguageStudio";

function n(v: string | number | undefined) {
  return Number(v ?? 0).toLocaleString();
}

export default function OverviewPage() {
  const { counts } = getManifest();
  const adults = counts.adults;
  const flagged = counts.flagged;
  const sharePct = Math.round((flagged / Math.max(adults, 1)) * 100);

  return (
    <div>
      {/* ============================ HERO ============================ */}
      <section className="border-b border-[color:var(--border)] bg-[color:var(--surface)]">
        <div className="mx-auto max-w-[1000px] px-6 py-14">
          <p className="eyebrow mb-3">Clinician-governed care-gap outreach · Rhode Island community health centers</p>
          <h1 className="text-[32px] sm:text-[40px] leading-[1.08] font-semibold tracking-tight max-w-[18ch]">
            Close care gaps without adding another dashboard.
          </h1>
          <p className="mt-4 text-[16px] sm:text-[17px] text-[color:var(--muted)] max-w-[62ch] leading-[1.55]">
            CATCH turns existing community-health-center data into transparent, clinician-approved
            outreach, delivered in each patient’s preferred language and channel. Deterministic rules
            decide who needs follow-up; staff decide what gets sent.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="#workflow" className="btn btn-primary">See the workflow ↓</Link>
            <Link href="/queue" className="btn btn-ghost">Open the demo →</Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5">
            <Trust>Rule-based prioritization</Trust>
            <Trust>Human approval before outreach</Trust>
            <Trust>Complements existing EHR data</Trust>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1000px] px-6">
        {/* ===================== PROOF: real numbers ===================== */}
        <section className="py-9 border-b border-[color:var(--border)]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-5 gap-x-4">
            <Metric value={n(adults)} label="Synthetic adults evaluated" />
            <Metric value={n(flagged)} label="Potential care gaps found" accent />
            <Metric value={n(counts.urgent)} label="Ranked urgent for review" />
            <Metric value={`${sharePct}%`} label="Share of adults flagged" />
          </div>
          <p className="mt-4 text-[12px] text-[color:var(--faint)] max-w-[70ch]">
            Computed offline from SyntheticRI (Synthea) synthetic records, not real patients. CATCH
            demonstrates an auditable method; it does not report real Rhode Island prevalence. Every
            record shows the exact rule that flagged it.{" "}
            <Link href="/methodology" className="underline hover:text-[color:var(--muted)]">Methodology</Link>.
          </p>
        </section>

        {/* ===================== PRIMARY USERS ===================== */}
        <Section title="Who buys it, who uses it, who benefits" eyebrow="Audience">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UserCard
              role="Buyer / owner"
              who="RI community health centers"
              detail="Care-management leaders, population-health and clinical-operations teams who own outreach capacity."
            />
            <UserCard
              role="Daily user"
              who="Care team staff"
              detail="Nurses, medical assistants, care coordinators, and community health workers who review and approve outreach."
            />
            <UserCard
              role="Beneficiary"
              who="Overdue patients"
              detail="People with overdue chronic or preventive follow-up, initially prioritizing RI Hispanic/Latino communities."
            />
          </div>
        </Section>

        {/* ===================== WORKFLOW ===================== */}
        <Section id="workflow" title="The workflow, end to end" eyebrow="How it works">
          <p className="text-[14px] text-[color:var(--muted)] max-w-[68ch] mb-5 -mt-1">
            One path from data a clinic already has to an auditable outcome logged back to the care
            team. A human reviews and approves before anything is sent.
          </p>
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Step n={1} title="Existing data in" body="CSV / FHIR / registry export a clinic already maintains. Minimum-necessary fields only." />
            <Step n={2} title="Transparent rules" body="Versioned, deterministic eligibility and exclusion logic decides who has a care gap." />
            <Step n={3} title="Prioritized worklist" body="Each patient ranked with a plain-language reason and last-contact context." />
            <Step n={4} title="Tailored draft" body="An approved template, adapted for the patient’s language and community style." />
            <Step n={5} title="Staff review" body="A person reads the draft, checks the back-translation, and edits if needed." />
            <Step n={6} title="Approve & send" body="SMS or email, only after human approval and only to a consented channel." />
            <Step n={7} title="Outcome logged" body="Status, version, consent, and timestamps written back for the care team." accent />
            <Step n={8} title="Patient in control" body="Patient chooses language and channel and can opt out or reach a person anytime." accent />
          </ol>
        </Section>

        {/* ===================== CLINICAL / COMMUNITY NEED ===================== */}
        <Section title="Why this matters in Rhode Island" eyebrow="Clinical & community need">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6 items-start">
            <div className="surface p-5">
              <p className="text-[14.5px] leading-[1.6] text-[color:var(--ink)]">
                When outreach capacity is scarce, missed follow-up becomes a clinical risk. Community
                health centers carry a disproportionate share of primary care for Hispanic/Latino and
                lower-income patients, exactly where a small staff must reach the most people. CATCH is
                a <strong>force multiplier for the existing workforce</strong>: it helps staff identify,
                review, and contact the right patients faster, in the language and channel each patient
                prefers.
              </p>
              <ul className="mt-4 space-y-2">
                <Benefit>Improved reach for patients who fall through follow-up gaps</Benefit>
                <Benefit>Language access as a first-class feature, not an afterthought</Benefit>
                <Benefit>Trust and continuity through community-reviewed wording</Benefit>
              </ul>
            </div>
            <div className="rounded-[var(--r-lg)] border border-dashed border-[color:var(--border-strong)] bg-[color:var(--panel)] p-5">
              <span className="eyebrow">Evidence panel · sources to attach</span>
              <p className="mt-2 text-[13px] text-[color:var(--muted)] leading-[1.55]">
                This panel is structured for verified citations. Figures on RI primary-care workforce
                constraints and the share of Hispanic/Latino patients served by community health centers
                will be sourced from public data (e.g. HRSA UDS, RI DOH) before the presentation.
              </p>
              <ul className="mt-3 space-y-1.5 text-[12.5px] text-[color:var(--muted)]">
                <li className="flex gap-2"><span className="text-[color:var(--faint)]" aria-hidden>▢</span> RI primary-care workforce shortage designation <em className="text-[color:var(--faint)]">[cite]</em></li>
                <li className="flex gap-2"><span className="text-[color:var(--faint)]" aria-hidden>▢</span> Share of RI FQHC patients who are Hispanic/Latino <em className="text-[color:var(--faint)]">[cite]</em></li>
                <li className="flex gap-2"><span className="text-[color:var(--faint)]" aria-hidden>▢</span> Hypertension control disparities by language access <em className="text-[color:var(--faint)]">[cite]</em></li>
              </ul>
              <p className="mt-3 text-[11px] text-[color:var(--faint)]">
                We label figures as pending rather than state numbers we have not yet verified.
              </p>
            </div>
          </div>
        </Section>

        {/* ===================== EXPLAINABLE RULES ===================== */}
        <Section title="Explainable rules, not a black box" eyebrow="Why this patient?">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 items-start">
            <div className="surface p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-semibold">Synthetic patient · 1fc9fb4d</span>
                <span className="prio-label prio-urgent inline-flex items-center gap-1.5"><span className="dot dot-urgent" aria-hidden />Urgent</span>
              </div>
              <dl className="text-[13px] space-y-2">
                <WhyRow k="Rule fired" v="Treated but uncontrolled" />
                <WhyRow k="Eligibility" v="Hypertension diagnosis + antihypertensive on file, and 2+ systolic readings ≥ 140 after medication start." />
                <WhyRow k="Evidence fields" v="24 elevated readings (peak 158), diagnosis code, active medication, encounter history." />
                <WhyRow k="Exclusion checks" v="Adult (age ≥ 18); same-day readings de-duplicated; ambiguous medications not counted." />
                <WhyRow k="Reason ranked" v="Repeated highs while on treatment, with stacked cardiometabolic risk." />
                <WhyRow k="Version / time" v="engine v0.1.0 · reference date 2026-05-15" />
              </dl>
              <p className="mt-3 text-[11.5px] text-[color:var(--faint)]">Synthetic record. See the live version, with the decision path highlighted, in the queue.</p>
            </div>
            <div className="flex flex-col justify-center">
              <div className="rounded-[var(--r-lg)] border border-[color:var(--accent)] bg-[color:var(--accent-weak)] p-5">
                <p className="text-[15px] leading-[1.6] text-[color:var(--accent-ink)] font-medium">
                  Rules decide <em>who</em> needs outreach. AI helps adapt <em>an approved message</em>.
                  Staff decide <em>what</em> gets sent.
                </p>
              </div>
              <p className="mt-4 text-[13.5px] text-[color:var(--muted)] leading-[1.6]">
                Eligibility and prioritization are 100% deterministic and auditable, you can read the
                exact criteria for every flag. Generative assistance is constrained to wording, tone,
                and reading level. It never decides who is contacted and never sends on its own.
              </p>
              <Link href="/queue" className="mt-4 text-[13px] font-medium text-[color:var(--accent)] hover:underline">
                Open a real record in the queue →
              </Link>
            </div>
          </div>
        </Section>

        {/* ===================== LANGUAGE STUDIO ===================== */}
        <Section title="One language is not one community" eyebrow="Language & community congruence">
          <p className="text-[14px] text-[color:var(--muted)] max-w-[70ch] mb-5 -mt-1">
            Generic Spanish can miss differences in vocabulary, tone, health literacy, and trust. CATCH
            treats community style as governed configuration: the clinical meaning is locked, the wording
            is community-reviewed, and the patient chooses their preference. Pick a style and channel
            below, the message changes, the meaning does not.
          </p>
          <LanguageStudio />
          <p className="mt-3 text-[11.5px] text-[color:var(--faint)] max-w-[70ch]">
            This short list does not represent every Hispanic/Latino or Portuguese-speaking identity, and
            styles are never inferred from ethnicity. Non-English variants are prototypes awaiting review
            by speakers from each community; an “other / patient-preferred wording” fallback always exists.
          </p>
        </Section>

        {/* ===================== COMPARISON ===================== */}
        <Section title="How CATCH compares" eyebrow="Existing tools vs. CATCH">
          <div className="surface overflow-x-auto">
            <table className="w-full text-[12.5px] border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-[color:var(--border)] text-left">
                  <th className="font-semibold px-3.5 py-2.5 text-[color:var(--ink)]">Capability</th>
                  <th className="font-medium px-3 py-2.5 text-[color:var(--muted)]">EHR / registry</th>
                  <th className="font-medium px-3 py-2.5 text-[color:var(--muted)]">Bulk messaging</th>
                  <th className="font-medium px-3 py-2.5 text-[color:var(--muted)]">General-purpose AI</th>
                  <th className="font-semibold px-3.5 py-2.5 text-[color:var(--accent-ink)] bg-[color:var(--accent-weak)]">CATCH</th>
                </tr>
              </thead>
              <tbody>
                <Cmp cap="Uses existing clinical data" a="Yes" b="Sometimes" c="Not inherently" d="Yes" />
                <Cmp cap="Transparent care-gap eligibility rules" a="Varies" b="No" c="No" d="Yes" />
                <Cmp cap="Prioritized outreach worklist" a="Varies" b="Limited" c="No" d="Yes" />
                <Cmp cap="Community-reviewed language variants" a="Limited" b="Limited" c="Ungoverned" d="Designed in" />
                <Cmp cap="Human approval before outreach" a="Workflow-dependent" b="Sometimes" c="Not inherently" d="Required" />
                <Cmp cap="Rule / message version audit trail" a="Varies" b="Limited" c="Limited" d="Designed in" />
                <Cmp cap="Replaces existing datasets" a="No" b="No" c="No" d="No — complements" />
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-[color:var(--faint)]">“Varies”, “limited”, and “workflow-dependent” reflect that capabilities depend on the specific product and configuration.</p>
        </Section>

        {/* ===================== FEASIBILITY ===================== */}
        <Section title="Technical feasibility & safety architecture" eyebrow="Implementation readiness">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Arch title="Inputs" state="planned" body="CSV / FHIR / EHR export or existing registry data. Minimum-necessary fields." />
            <Arch title="Rules engine" state="demo" body="Versioned deterministic criteria + exclusion logic. Running in this demo." />
            <Arch title="Template layer" state="demo" body="Approved base content + constrained language adaptation. Shown above." />
            <Arch title="Human-in-the-loop" state="demo" body="Draft → reviewed → approved before any send. Shown above." />
            <Arch title="Delivery adapter" state="production" body="SMS / email only after authorization and approval. Not built in this sprint." />
            <Arch title="Logging" state="demo" body="Role, rule version, message version, consent/channel, timestamps, status." />
            <Arch title="Security posture" state="production" body="Role-based access, encryption in transit/at rest, retention controls, vendor BAAs." />
            <Arch title="Model boundary" state="demo" body="No PHI to unapproved model providers; generation limited to wording." />
            <Arch title="HIPAA posture" state="production" body="HIPAA-ready architecture; designed for HIPAA-aligned deployment. Not yet assessed." />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[11.5px] text-[color:var(--muted)]">
            <LegendDot tone="routine" label="Implemented in demo" />
            <LegendDot tone="high" label="Planned for pilot" />
            <LegendDot tone="urgent" label="Required before production" />
          </div>
        </Section>

        {/* ===================== PILOT ===================== */}
        <Section title="A credible first pilot" eyebrow="Adoption plan">
          <div className="surface p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <PilotStat k="Scope" v="1 RI community health center, 1 high-priority care-gap workflow" />
              <PilotStat k="Sequence" v="Historical / synthetic validation first, then staff-supervised outreach" />
              <PilotStat k="Duration" v="8–12 week phased pilot with a small group of coordinators / CHWs" />
            </div>
            <span className="eyebrow">Success measures (targets, not proven results)</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                "Eligible patients identified correctly",
                "Staff review time",
                "Approved-to-sent rate",
                "Delivery / response rate",
                "Appointments or completed follow-up",
                "Opt-outs",
                "Language preference captured",
                "Subgroup equity checks",
              ].map((m) => (
                <span key={m} className="chip">{m}</span>
              ))}
            </div>
            <p className="mt-3 text-[12px] text-[color:var(--muted)]">
              An explicit <strong>stop / go review</strong> for safety, staff workload, and message
              quality gates any expansion. This is a proposed pilot; no health center is named or committed.
            </p>
          </div>
        </Section>

        {/* ===================== JUDGE FEEDBACK ===================== */}
        <Section title="You said, we changed" eyebrow="Responsiveness to judge feedback">
          <div className="surface overflow-hidden divide-y divide-[color:var(--border)]">
            <YouWe q="Who is the end user?" a="Buyer, daily user, and patient beneficiary are now explicitly defined at the top of the page." />
            <YouWe q="How is CATCH different?" a="Transparent rules + governed language adaptation + staff approval + a version audit trail." />
            <YouWe q="Focus on underserved RI communities" a="Initial deployment centers Hispanic/Latino patients, with English / Spanish / Portuguese access." />
            <YouWe q="SMS or email?" a="Patient-preferred channel, with consent, opt-out, and staff review before send." />
            <YouWe q="Complement existing datasets" a="CATCH ingests existing EHR / registry data and writes outcomes back; it does not replace the source of truth." />
            <YouWe q="HIPAA and medical compliance" a="Minimum-necessary architecture, access controls, auditability, BAAs, and pre-production review shown honestly, no compliance is claimed as complete." />
          </div>
        </Section>

        {/* footer honesty */}
        <section className="py-10">
          <p className="text-[12px] text-[color:var(--faint)] max-w-[74ch] leading-relaxed">
            CATCH is a clinician-governed, rule-based care-gap outreach copilot. It does not diagnose,
            triage emergencies, practice medicine, replace clinicians, or autonomously send messages. All
            data shown is synthetic (SyntheticRI / Synthea). Efficiency, outcome, and equity gains are
            stated as pilot hypotheses and targets, not proven results.
          </p>
        </section>
      </div>
    </div>
  );
}

/* ---------- small presentational pieces (local to the homepage) ---------- */

function Trust({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-[color:var(--ink)]">
      <span className="grid place-items-center w-4 h-4 rounded-full bg-[color:var(--accent-weak)] text-[color:var(--accent)] text-[10px]" aria-hidden>✓</span>
      {children}
    </span>
  );
}

function Metric({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div>
      <div className={`text-[30px] font-semibold tracking-tight tabular-nums ${accent ? "text-[color:var(--accent-ink)]" : "text-[color:var(--ink)]"}`}>{value}</div>
      <div className="text-[12px] text-[color:var(--muted)] mt-0.5 max-w-[20ch]">{label}</div>
    </div>
  );
}

function Section({ title, eyebrow, id, children }: { title: string; eyebrow: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="py-9 border-b border-[color:var(--border)] scroll-mt-16">
      <p className="eyebrow mb-1.5">{eyebrow}</p>
      <h2 className="text-[20px] sm:text-[22px] font-semibold tracking-tight mb-4">{title}</h2>
      {children}
    </section>
  );
}

function UserCard({ role, who, detail }: { role: string; who: string; detail: string }) {
  return (
    <div className="surface p-4">
      <span className="eyebrow">{role}</span>
      <div className="text-[15px] font-semibold text-[color:var(--ink)] mt-1">{who}</div>
      <p className="text-[12.5px] text-[color:var(--muted)] mt-1.5 leading-[1.5]">{detail}</p>
    </div>
  );
}

function Step({ n, title, body, accent }: { n: number; title: string; body: string; accent?: boolean }) {
  return (
    <li className="surface p-3.5">
      <span className={`inline-grid place-items-center w-6 h-6 rounded-full text-[12px] font-semibold ${accent ? "bg-[color:var(--accent)] text-white" : "bg-[color:var(--accent-weak)] text-[color:var(--accent)]"}`}>{n}</span>
      <div className="text-[13.5px] font-semibold text-[color:var(--ink)] mt-2">{title}</div>
      <p className="text-[12px] text-[color:var(--muted)] mt-1 leading-[1.45]">{body}</p>
    </li>
  );
}

function Benefit({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-[13px] text-[color:var(--ink)]">
      <span className="text-[color:var(--accent)] shrink-0" aria-hidden>→</span>
      <span>{children}</span>
    </li>
  );
}

function WhyRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <dt className="text-[color:var(--muted)] w-[92px] shrink-0">{k}</dt>
      <dd className="flex-1 text-[color:var(--ink)]">{v}</dd>
    </div>
  );
}

function Cmp({ cap, a, b, c, d }: { cap: string; a: string; b: string; c: string; d: string }) {
  return (
    <tr className="border-b border-[color:var(--border)] last:border-0">
      <td className="px-3.5 py-2.5 font-medium text-[color:var(--ink)]">{cap}</td>
      <td className="px-3 py-2.5 text-[color:var(--muted)]">{a}</td>
      <td className="px-3 py-2.5 text-[color:var(--muted)]">{b}</td>
      <td className="px-3 py-2.5 text-[color:var(--muted)]">{c}</td>
      <td className="px-3.5 py-2.5 font-semibold text-[color:var(--accent-ink)] bg-[color:var(--accent-weak)]">{d}</td>
    </tr>
  );
}

function Arch({ title, body, state }: { title: string; body: string; state: "demo" | "planned" | "production" }) {
  const tone = state === "demo" ? "routine" : state === "planned" ? "high" : "urgent";
  return (
    <div className="surface p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-[color:var(--ink)]">{title}</span>
        <span className={`dot dot-${tone}`} aria-hidden />
      </div>
      <p className="text-[12px] text-[color:var(--muted)] mt-1.5 leading-[1.45]">{body}</p>
    </div>
  );
}

function LegendDot({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5"><span className={`dot dot-${tone}`} aria-hidden />{label}</span>
  );
}

function PilotStat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <span className="eyebrow">{k}</span>
      <p className="text-[13px] text-[color:var(--ink)] mt-1 leading-[1.5]">{v}</p>
    </div>
  );
}

function YouWe({ q, a }: { q: string; a: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,240px)_1fr]">
      <div className="px-4 py-3 text-[13px] font-medium text-[color:var(--accent-ink)] bg-[color:var(--panel)] sm:bg-transparent">{q}</div>
      <div className="px-4 py-3 text-[13px] text-[color:var(--muted)] leading-[1.5] border-t sm:border-t-0 sm:border-l border-[color:var(--border)]">{a}</div>
    </div>
  );
}
