import Link from "next/link";
import { getManifest } from "@/lib/data";
import LanguageStudio from "@/components/LanguageStudio";
import Reveal from "@/components/Reveal";
import CountUp from "@/components/CountUp";

export default function AboutPage() {
  const { counts } = getManifest();
  const adults = counts.adults;
  const flagged = counts.flagged;
  const sharePct = Math.round((flagged / Math.max(adults, 1)) * 100);

  return (
    <div>
      {/* ============================ HERO ============================ */}
      <section className="border-b border-[color:var(--border)] bg-[color:var(--surface)]">
        <div className="mx-auto max-w-[1000px] px-6 py-14 hero-rise">
          <p className="eyebrow mb-3">About CATCH · clinician-governed care-gap outreach for Rhode Island FQHCs</p>
          <h1 className="text-[32px] sm:text-[40px] leading-[1.08] font-semibold tracking-tight max-w-[18ch]">
            Close care gaps without adding another dashboard.
          </h1>
          <p className="mt-4 text-[16px] sm:text-[17px] text-[color:var(--muted)] max-w-[62ch] leading-[1.55]">
            CATCH turns existing community-health-center data into transparent, clinician-approved
            outreach, delivered in each patient’s preferred language and channel. Deterministic rules
            decide who needs follow-up; staff decide what gets sent.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/" className="btn btn-primary">Open the worklist →</Link>
            <Link href="#workflow" className="btn btn-ghost">See the workflow ↓</Link>
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
          <Reveal className="grid grid-cols-2 sm:grid-cols-4 gap-y-5 gap-x-4">
            <Metric to={adults} label="Synthetic adults evaluated" />
            <Metric to={flagged} label="Potential care gaps found" accent />
            <Metric to={counts.urgent} label="Ranked urgent for review" />
            <Metric to={sharePct} suffix="%" label="Share of adults flagged" />
          </Reveal>
          <p className="mt-4 text-[12px] text-[color:var(--faint)] max-w-[70ch]">
            Computed offline from SyntheticRI (Synthea) synthetic records, not real patients. CATCH
            demonstrates an auditable method; it does not report real Rhode Island prevalence. Every
            record shows the exact rule that flagged it.{" "}
            <Link href="/methodology" className="underline hover:text-[color:var(--muted)]">Methodology</Link>.
          </p>
        </section>

        {/* ===================== PRIMARY USERS ===================== */}
        <Section title="Who it's for" eyebrow="Audience">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UserCard
              role="Buyer / owner"
              who="RI FQHCs"
              detail="Federally Qualified Health Centers: care-management leaders, population-health and clinical-operations teams who own outreach capacity."
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
                When outreach capacity is tight, follow-up that never happens turns into a clinical
                risk. Federally Qualified Health Centers (FQHCs) see a large share of the Hispanic/Latino
                and lower-income patients in the state, and often with a small staff. CATCH helps that
                staff <strong>do more with the hours they have</strong>: it shows who needs follow-up,
                the evidence behind each flag, and a draft message in the patient&apos;s language and channel.
              </p>
              <ul className="mt-4 space-y-2">
                <Benefit>Reaches patients who tend to slip between visits</Benefit>
                <Benefit>Outreach in the patient&apos;s own language, not only English</Benefit>
                <Benefit>Wording checked by people from the community, so it reads right</Benefit>
              </ul>
              <p className="mt-4 text-[13px] text-[color:var(--ink)] border-t border-[color:var(--border)] pt-3">
                <span className="font-medium">Try it in the demo:</span> in the{" "}
                <Link href="/queue" className="text-[color:var(--accent)] hover:underline">outreach queue</Link>, use the{" "}
                <span className="font-medium">Language access</span> lens to surface the patients flagged for interpreter
                support, an access-based proxy for reaching LEP patients, routed to bilingual community health workers.
                It filters on documented interpreter need, never on race or ethnicity.
              </p>
            </div>
            <div className="rounded-[var(--r-lg)] border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
              <span className="eyebrow">The need in Rhode Island · public data</span>
              <dl className="mt-3.5 space-y-3.5">
                <EvidenceStat
                  value="1 in 3"
                  label="RI adults have been diagnosed with hypertension"
                  source="RI BRFSS"
                  href="https://ctc-ri.org/05/14/2025/blood-pressure-awareness-may-2025"
                />
                <EvidenceStat
                  value="~1 in 4"
                  label="adults with high blood pressure have it under control (national)"
                  source="CDC"
                  href="https://ctc-ri.org/05/14/2025/blood-pressure-awareness-may-2025"
                />
                <EvidenceStat
                  value="42.9%"
                  label="of RI FQHC patients are Hispanic/Latino (88,914 of 220,417); 25.1% are best served in a language other than English"
                  source="HRSA UDS 2024"
                  href="https://data.hrsa.gov/tools/data-reporting/program-data/state/RI"
                />
              </dl>
              <p className="mt-3.5 text-[11px] text-[color:var(--faint)] leading-[1.5]">
                National figures are labeled as national. CATCH&apos;s own counts come from synthetic data
                and do not report a real Rhode Island prevalence rate.
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
                <Cmp cap="Replaces existing datasets" a="No" b="No" c="No" d="No, it complements" />
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-[color:var(--faint)]">
            Categories, not vendors: EHR / registry care-gap modules, bulk patient-messaging platforms,
            and general-purpose chat assistants. “Varies”, “limited”, and “workflow-dependent” reflect
            that capabilities depend on the specific product and configuration.
          </p>
        </Section>

        {/* ===================== BUSINESS MODEL ===================== */}
        <Section title="Who pays, and how" eyebrow="Business model">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="surface p-4">
              <span className="eyebrow">Who pays</span>
              <p className="text-[13px] text-[color:var(--ink)] mt-1.5 leading-[1.5]">
                Rhode Island FQHCs, and the Medicaid managed-care and value-based programs they
                contract with, who carry the quality measures CATCH helps close.
              </p>
            </div>
            <div className="surface p-4">
              <span className="eyebrow">Pricing (proposed)</span>
              <p className="text-[13px] text-[color:var(--ink)] mt-1.5 leading-[1.5]">
                A per-attributed-patient subscription, a one-time integration and onboarding fee, and an
                optional paid community-language review service.
              </p>
            </div>
            <div className="surface p-4">
              <span className="eyebrow">Why they adopt</span>
              <p className="text-[13px] text-[color:var(--ink)] mt-1.5 leading-[1.5]">
                Closes documented hypertension care gaps that feed quality measures (e.g. HEDIS
                Controlling High Blood Pressure), and helps a small team cover more patients.
              </p>
            </div>
          </div>
          <div className="surface p-4 mt-4">
            <span className="eyebrow">Cost structure</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-2 text-[12.5px]">
              <p className="text-[color:var(--ink)]"><span className="font-semibold">Fixed:</span> product &amp; security engineering, clinical-rule governance, and template maintenance.</p>
              <p className="text-[color:var(--ink)]"><span className="font-semibold">Variable:</span> EHR / FHIR integration, SMS / email delivery, implementation, staff training, and paid community-language review.</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-[color:var(--faint)]">
            Shown as a model, not a quote.
          </p>
        </Section>

        {/* ===================== FEASIBILITY ===================== */}
        <Section title="Technical feasibility & safety architecture" eyebrow="Implementation readiness">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Arch title="Inputs" state="planned" body="CSV, FHIR, or EHR export from existing registry data. Minimum-necessary fields only." />
            <Arch title="Rules engine" state="demo" body="Versioned, deterministic eligibility and exclusion logic." />
            <Arch title="Template layer" state="demo" body="Approved base content with constrained language adaptation." />
            <Arch title="Human review" state="demo" body="Draft, reviewed, and approved before anything sends." />
            <Arch title="Delivery" state="production" body="SMS or email, only after authorization and approval." />
            <Arch title="Logging" state="demo" body="Role, rule version, message version, consent, channel, and timestamps." />
            <Arch title="Security" state="production" body="Role-based access, encryption in transit and at rest, retention controls, and vendor BAAs." />
            <Arch title="Model boundary" state="demo" body="No PHI to unapproved model providers; generation limited to wording." />
            <Arch title="HIPAA posture" state="production" body="HIPAA-ready architecture, designed for HIPAA-aligned deployment." />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[11.5px] text-[color:var(--muted)]">
            <LegendDot tone="routine" label="Implemented in demo" />
            <LegendDot tone="high" label="Planned for pilot" />
            <LegendDot tone="urgent" label="Required before production" />
          </div>
        </Section>

        {/* ===================== PILOT ===================== */}
        <Section title="The first pilot" eyebrow="Adoption plan">
          <div className="surface p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <PilotStat k="Scope" v="1 RI FQHC, 1 high-priority care-gap workflow" />
              <PilotStat k="Sequence" v="Historical / synthetic validation first, then staff-supervised outreach" />
              <PilotStat k="Duration" v="8 to 12 week phased pilot with a small group of coordinators / CHWs" />
            </div>
            <span className="eyebrow">What we would measure</span>
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
              quality gates any expansion.
            </p>
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

function Metric({ to, suffix, label, accent }: { to: number; suffix?: string; label: string; accent?: boolean }) {
  return (
    <div>
      <div className={`text-[30px] font-semibold tracking-tight tabular-nums ${accent ? "text-[color:var(--accent-ink)]" : "text-[color:var(--ink)]"}`}>
        <CountUp to={to} suffix={suffix} />
      </div>
      <div className="text-[12px] text-[color:var(--muted)] mt-0.5 max-w-[20ch]">{label}</div>
    </div>
  );
}

function Section({ title, eyebrow, id, children }: { title: string; eyebrow: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="py-9 border-b border-[color:var(--border)] scroll-mt-16">
      <Reveal>
        <p className="eyebrow mb-1.5">{eyebrow}</p>
        <h2 className="text-[20px] sm:text-[22px] font-semibold tracking-tight mb-4">{title}</h2>
        <div>{children}</div>
      </Reveal>
    </section>
  );
}

function UserCard({ role, who, detail }: { role: string; who: string; detail: string }) {
  return (
    <div className="surface p-4 lift">
      <span className="eyebrow">{role}</span>
      <div className="text-[15px] font-semibold text-[color:var(--ink)] mt-1">{who}</div>
      <p className="text-[12.5px] text-[color:var(--muted)] mt-1.5 leading-[1.5]">{detail}</p>
    </div>
  );
}

function Step({ n, title, body, accent }: { n: number; title: string; body: string; accent?: boolean }) {
  return (
    <li className="surface p-3.5 lift">
      <span className={`inline-grid place-items-center w-6 h-6 rounded-full text-[12px] font-semibold ${accent ? "bg-[color:var(--accent)] text-white" : "bg-[color:var(--accent-weak)] text-[color:var(--accent)]"}`}>{n}</span>
      <div className="text-[13.5px] font-semibold text-[color:var(--ink)] mt-2">{title}</div>
      <p className="text-[12px] text-[color:var(--muted)] mt-1 leading-[1.45]">{body}</p>
    </li>
  );
}

function EvidenceStat({ value, label, source, href }: { value: string; label: string; source: string; href: string }) {
  return (
    <div className="flex gap-3 items-baseline">
      <span className="text-[22px] font-semibold tracking-tight tabular-nums text-[color:var(--accent-ink)] shrink-0 w-[62px]">{value}</span>
      <span className="text-[12.5px] text-[color:var(--ink)] leading-[1.45]">
        {label}{" "}
        <a href={href} target="_blank" rel="noreferrer" className="text-[color:var(--accent)] hover:underline whitespace-nowrap">{source} ↗</a>
      </span>
    </div>
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
    <div className="surface p-3.5 lift">
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

