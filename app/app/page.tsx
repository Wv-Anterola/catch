import Link from "next/link";
import { getQueue, getManifest, getCityStats } from "@/lib/data";
import {
  cityDistanceToNearestFqhc, assignCitiesToNearestFqhc,
  cityCoordinates, catchmentStatsBySite, RI_FQHCS,
} from "@/lib/fqhc";
import QueueClient from "@/components/QueueClient";

// The home page IS the product: opening CATCH drops you straight into the live
// hypertension care-gap worklist. A command header frames it as a clinical
// dashboard; open any patient for the evidence, the decision path, and a drafted
// outreach message in their language. The pitch narrative lives on /about.
export default function Home() {
  const cohort = getQueue();
  const { counts, funnel, version } = getManifest();
  const cities = getCityStats();

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
      <header className="mb-5">
        <p className="live-readout mb-2">
          <span className="pulse-dot inline-block w-[7px] h-[7px] text-[color:var(--brand-teal)]" aria-hidden>
            <span className="pulse-core beat" />
          </span>
          <span className="uppercase tracking-[0.11em]">Live worklist · SyntheticRI</span>
        </p>
        <h1 className="text-[23px] font-bold tracking-[-0.02em] text-[color:var(--accent-ink)]">Hypertension care-gap worklist</h1>
        <p className="text-[13.5px] text-[color:var(--muted)] mt-1.5 max-w-[86ch] leading-[1.55]">
          <span className="font-semibold text-[color:var(--ink)]">CATCH</span> flags Rhode Island FQHC
          patients with a hypertension care gap, shows exactly why each was flagged, and drafts an
          outreach message in the patient&apos;s language for staff to review and send. Open any patient
          for the evidence, the decision path, and the draft.{" "}
          <Link href="/about" className="text-[color:var(--accent)] hover:underline">What is CATCH?</Link>
        </p>
      </header>

      <QueueClient
        cohort={cohort}
        funnel={funnel}
        counts={counts}
        cityDistanceKm={cityDistanceToNearestFqhc(cities)}
        cityToSite={assignCitiesToNearestFqhc(cities)}
        cityCoords={cityCoordinates(cities)}
        siteCatchment={catchmentStatsBySite(cities)}
        fqhcSites={RI_FQHCS}
        totalFlagged={counts.flagged}
        version={version}
        showHeader={false}
      />

      <p className="mt-8 text-[12px] text-[color:var(--faint)] max-w-[86ch] leading-relaxed">
        Synthetic data (SyntheticRI / Synthea): a working demonstration of the method, not real
        patients and not a real Rhode Island prevalence rate. Deterministic rules decide who is
        flagged; a clinician reviews and approves every draft, and CATCH never sends messages on its
        own. See the{" "}
        <Link href="/methodology" className="underline hover:text-[color:var(--muted)]">methodology</Link>{" "}
        or the{" "}
        <Link href="/population" className="underline hover:text-[color:var(--muted)]">map of care gaps and FQHCs</Link>.
      </p>
    </div>
  );
}
