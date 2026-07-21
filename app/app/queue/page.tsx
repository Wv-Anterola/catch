import { getQueue, getManifest } from "@/lib/data";
import QueueClient from "@/components/QueueClient";

export default function QueuePage() {
  const cohort = getQueue();
  const { counts, funnel, version } = getManifest();
  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
      <QueueClient cohort={cohort} funnel={funnel} totalFlagged={counts.flagged} version={version} />
    </div>
  );
}
