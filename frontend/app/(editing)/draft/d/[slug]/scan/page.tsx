import { notFound } from "next/navigation";
import { getCachedDraftDropletBySlug } from "@/lib/requests/cached";
import { loadScanDocument } from "@/lib/overview-scan/scan";
import {
  getLatestOverviewScan,
  getScanDismissals,
} from "@/lib/requests/overview-scan";
import { CHECKS } from "@/lib/overview-scan/checks";
import { buildScanView } from "@/lib/overview-scan/view";
import { OverviewScanPage } from "@/components/draft/overview-scan/overview-scan-page";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const droplet = await getCachedDraftDropletBySlug(slug);
  return droplet ? { title: `Final Overview Scan | ${droplet.name}` } : {};
}

export default async function ScanPage({ params }: Props) {
  const { slug } = await params;
  const droplet = await getCachedDraftDropletBySlug(slug);
  if (!droplet) return notFound();

  const [scan, fresh, dismissed] = await Promise.all([
    getLatestOverviewScan(droplet.id),
    loadScanDocument(droplet.id),
    getScanDismissals(droplet.id),
  ]);
  if (!scan.ok && scan.error !== "failed") return notFound();
  // The scan still shows without them; nobody can dismiss until they load
  if (!dismissed.ok)
    console.error("getScanDismissals failed:", dismissed.error);

  const lessons = fresh.lessons.map((l) => ({
    id: l.id,
    name: l.name,
    slug: l.slug ?? "",
  }));
  const view = buildScanView({
    checks: CHECKS,
    scan: scan.data,
    lessons,
    contentHash: fresh.contentHash,
    slug,
  });

  return (
    <OverviewScanPage
      dropletId={droplet.id}
      dropletName={droplet.name}
      slug={slug}
      lessonCount={lessons.length}
      view={view}
      loadError={!scan.ok}
      dismissals={dismissed.data?.dismissals ?? []}
      canDismiss={dismissed.data?.canDismiss ?? false}
      dismissalsError={!dismissed.ok}
    />
  );
}
