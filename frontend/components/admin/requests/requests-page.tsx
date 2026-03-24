import { fetchAccessRequests } from "@/lib/requests/data";
import { fetchAuthorizedUsers } from "@/lib/requests/authorized-user";
import { fetchCreationRequests } from "@/lib/actions";
import { accessFilter } from "@/components/shared/access-manager/access-requests/access-requests";
import { RequestsPageClient } from "./requests-page-client";

export async function RequestsPage() {
  const [accessRequests, authorizedUsers, creationRequests] = await Promise.all(
    [fetchAccessRequests(), fetchAuthorizedUsers(), fetchCreationRequests()],
  );

  const filteredAccessRequests = accessFilter(accessRequests, authorizedUsers);

  return (
    <RequestsPageClient
      accessRequests={filteredAccessRequests}
      creationRequests={creationRequests}
    />
  );
}
