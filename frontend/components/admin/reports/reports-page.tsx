import { fetchReports } from "@/lib/requests/data";
import { ReportsPageClient } from "./reports-page-client";

export async function ReportsPage() {
  const reports = await fetchReports();
  return <ReportsPageClient reports={reports} />;
}
