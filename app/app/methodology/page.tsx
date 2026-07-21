import { getManifest } from "@/lib/data";

export default function MethodologyPage() {
  const meta = getManifest().meta;
  const metaLine = [
    `Engine ${meta.engine_version}`,
    meta.build_timestamp ? `built ${String(meta.build_timestamp).slice(0, 10)}` : null,
    `reference ${meta.reference_date}`,
    `${Number(meta.total_patients ?? 0).toLocaleString()} records`,
    `${Number(meta.adults ?? 0).toLocaleString()} adults`,
    `systolic ≥ ${meta.systolic_high} mmHg`,
  ].filter(Boolean).join(" · ");

  return (
    <article className="mx-auto max-w-[720px] px-6 py-10 text-[color:var(--ink)]">
      <h1 className="text-[20px] font-semibold tracking-tight">Methodology &amp; limitations</h1>
      <p className="text-[13px] text-[color:var(--muted)] mt-1">
        CATCH is deterministic and auditable. Every flag traces to explicit rules: no prediction,
        no black box.
      </p>
      <p className="mt-3 text-[12px] text-[color:var(--faint)] border-y border-[color:var(--border)] py-2">
        {metaLine}
      </p>

      <Section title="What data was analyzed">
        The full SyntheticRI / Synthea bundle: patient demographics and geography, blood-pressure
        and lab observations (systolic, diastolic, BMI, LDL, A1c), hypertension and comorbidity
        diagnoses, antihypertensive medications with start dates, and encounters. Claims and imaging
        files were not needed and were skipped.
      </Section>

      <Section title="What the rules do">
        <p><strong>Undiagnosed care gap.</strong> An adult (alive, age ≥ {meta.adult_min_age}) with
        at least {meta.min_qualifying_highs} systolic readings ≥ {meta.systolic_high} mmHg on
        distinct adult-age days, and no hypertension diagnosis on file.</p>
        <p className="mt-2"><strong>Treated but uncontrolled.</strong> A hypertension diagnosis plus
        non-ambiguous antihypertensive medication plus at least {meta.min_qualifying_highs} elevated
        readings after treatment began (so a single high during titration does not qualify).</p>
        <p className="mt-2"><strong>Priority.</strong> Urgent / high / routine, derived from severity
        (≥ {meta.systolic_severe}), reading count, and stacked comorbidities (obesity, high LDL,
        hyperlipidemia, prediabetes, metabolic syndrome). Every priority shows its contributing factors.</p>
      </Section>

      <Section title="What the rules do not do">
        CATCH does not diagnose or predict. It flags records that match an explicit review rule for a
        human to check, and every flag can be dismissed by a clinician in seconds. Pediatric readings
        are excluded. Loop diuretics (furosemide) and ARNI (sacubitril/valsartan) are treated as
        ambiguous heart-failure agents and are not counted as antihypertensive treatment.
      </Section>

      <Section title="Validation">
        Sixteen engine unit fixtures cover the edge cases (minors, same-day duplicates, diagnosis
        timing, titration lag, missing values). On the 1,000-patient sample the engine reproduces the
        exploratory pattern and matches the 45-59 and 60+ age-band miss rates exactly. Restricting to
        adult-age readings gives about half of repeated-high adults undiagnosed (~49% in the sample),
        slightly more conservative than an earlier count that included pre-adult readings.
      </Section>

      <Section title="Known limitations &amp; honesty">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>SyntheticRI is synthetic. The numbers show the method works, not a real Rhode Island rate.</li>
          <li>The disparity we can defend is <strong>age</strong> (younger adults missed most). We did not test protected-group disparities and make no such claim.</li>
          <li>A diagnosed-but-untreated stage was essentially empty in the data, so we dropped it.</li>
          <li>Some synthetic records carry artifacts (very high visit counts, implausible ages). These are flagged with a data-quality note and demoted in the queue.</li>
          <li>Outreach messages are drafts only. CATCH never sends anything.</li>
        </ul>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="text-[15px] font-semibold mb-2">{title}</h2>
      <div className="text-[14px] leading-relaxed text-[color:var(--ink)]/90">{children}</div>
    </section>
  );
}
