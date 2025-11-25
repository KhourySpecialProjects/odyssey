import { CreationRequest } from "@/types";
import { CreationRequestBlock } from "./creation-request-block";
import { fetchCreationRequests } from "@/lib/actions";

export async function CreationRequests() {
  const creationRequests = await fetchCreationRequests();

  return (
    <section>
      <h1 className="font-bold dark:text-slate-300">
        Content Creation Requests
      </h1>
      <p className="dark:text-slate-300">
        The following individuals have requested to become a content creator.
      </p>
      <div className="mt-4 rounded-md bg-slate-100 p-4 dark:bg-slate-800">
        {creationRequests.length > 0 ? (
          <ul className="divide-y divide-slate-200 md:space-y-4 dark:divide-slate-700">
            {creationRequests.map((request: CreationRequest) => {
              return (
                <CreationRequestBlock request={request} key={request.id} />
              );
            })}
          </ul>
        ) : (
          <p>There are no access requests at this time.</p>
        )}
      </div>
    </section>
  );
}
