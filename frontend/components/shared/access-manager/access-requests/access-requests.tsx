import { fetchAccessRequests } from "@/lib/requests/data";
import { AccessRequestBlock } from "./access-request";

export type AccessRequest = {
  id: string;
  givenName: string;
  familyName: string;
  email: string;
  affiliation: string;
  college: string;
};

export async function AccessRequests() {
  const accessRequests = await fetchAccessRequests();

  return (
    <section>
      <h1 className="font-bold dark:text-slate-300">Access Requests</h1>
      <p className="dark:text-slate-300">
        The following individuals have requested access to this application.
      </p>

      <div className="p-4 mt-4 rounded-md bg-slate-100 dark:bg-slate-800">
        {accessRequests.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">
            {accessRequests.map((request: AccessRequest) => (
              <AccessRequestBlock request={request} key={request.id} />
            ))}
          </ul>
        ) : (
          <p>There are no access requests at this time.</p>
        )}
      </div>
    </section>
  );
}
