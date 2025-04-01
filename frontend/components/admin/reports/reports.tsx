import { fetchReports } from "@/lib/requests/data";
import { ReportBlock } from "./report";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { deleteReport } from "@/lib/actions";

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
      <h1 className="font-bold dark:text-slate-300">Reports</h1>
      <p className="dark:text-slate-300">
        The following reports have been received from users.
      </p>

      <div className="p-4 mt-4 rounded-md bg-slate-100 dark:bg-slate-800 dark:text-slate-300">
        {reports.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">
            {reports.map((report: Report) => (
              <div key={report.id}>
                <ReportBlock report={report} key={report.id} />
              </div>
            ))}
          </ul>
        ) : (
          <p>There are no reports at this time.</p>
        )}
      </div>
    </section>
  );
}
