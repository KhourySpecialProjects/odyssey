import { fetchAccessRequests } from "@/lib/requests/data";
import { AccessRequestBlock } from "./access-request";
import { fetchAuthorizedUsers } from "@/lib/requests/authorized-user";
import { AuthorizedUser } from "@/types";

export type AccessRequest = {
  id: string;
  givenName: string;
  familyName: string;
  email: string;
  affiliation: string;
  college: string;
};

export function accessFilter(requests: AccessRequest[], users: AuthorizedUser[]) {
  return (
    requests.filter((req) => 
      !users.some((user) => 
        (user.firstName?.toLowerCase() === req.givenName?.toLowerCase() &&
        user.lastName?.toLowerCase() === req.familyName?.toLowerCase() &&
        user.email?.toLowerCase() === req.email)
      )
    )
  )
}

export async function AccessRequests() {
  const accessRequests = await fetchAccessRequests();
  const authorizedUsers = await fetchAuthorizedUsers();

  const filteredRequests = accessFilter(accessRequests, authorizedUsers); 

  return (
    <section>
      <h1 className="font-bold dark:text-slate-300">Access Requests</h1>
      <p className="dark:text-slate-300">
        The following individuals have requested access to this application.
      </p>

      <div className="mt-4 rounded-md bg-slate-100 p-4 dark:bg-slate-800">
        {filteredRequests.length > 0 ? (
          <ul className="divide-y divide-slate-200 md:space-y-4 dark:divide-slate-700">
            {filteredRequests.map(
              (request: AccessRequest) => {
              return <AccessRequestBlock request={request} key={request.id} />
            })}
          </ul>
        ) : (
          <p>There are no access requests at this time.</p>
        )}
      </div>
    </section>
  );
}
