import { fetchReports } from "@/lib/requests/data";
import { ReportBlock } from "./report";

export type Report = {
  id: string;
  type: string;
  fullName: string;
  email: string;
  path: string;
  description: string;
};

export async function Reports() {
  const reports = await fetchReports();

  return (
    <section>
      <h1 className="font-bold">Reports</h1>
      <p>The following reports have been received from users.</p>

      <div className="p-4 mt-4 rounded-md bg-slate-100 dark:text-black">
        {reports.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">
            {reports.map((report: Report) => (
              <ReportBlock report={report} key={report.id} />
            ))}
          </ul>
        ) : (
          <p>There are no reports at this time.</p>
        )}
      </div>
    </section>
  );
}
