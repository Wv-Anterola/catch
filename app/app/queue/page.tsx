import { getQueue, getManifest, getCityStats } from "@/lib/data";
import {
  cityDistanceToNearestFqhc, assignCitiesToNearestFqhc,
  cityCoordinates, catchmentStatsBySite, RI_FQHCS,
} from "@/lib/fqhc";
import QueueClient from "@/components/QueueClient";

export default function QueuePage() {
  const cohort = getQueue();
  const { counts, funnel, version } = getManifest();
  const cities = getCityStats();
  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
      <QueueClient
        cohort={cohort}
        funnel={funnel}
        totalFlagged={counts.flagged}
        version={version}
        cityDistanceKm={cityDistanceToNearestFqhc(cities)}
        cityToSite={assignCitiesToNearestFqhc(cities)}
        cityCoords={cityCoordinates(cities)}
        siteCatchment={catchmentStatsBySite(cities)}
        fqhcSites={RI_FQHCS}
      />
    </div>
  );
}
