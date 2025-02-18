import { CreateGroup } from "./create-group";
import { fetchGroups } from "@/lib/requests/data";
import { GroupClient } from "./group-client";

export async function Groups() {
  const groups = await fetchGroups();

  return (
    <section>
      <h1 className="font-bold">Groups</h1>
      <p>The following groups have been created.</p>

      <div className="mt-4">
        <CreateGroup />
      </div>

      <GroupClient groups={groups}></GroupClient>
    </section>
  );
}
