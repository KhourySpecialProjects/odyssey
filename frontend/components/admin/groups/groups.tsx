import { Group } from "@/types";
import { CreateGroup } from "./create-group";
import { GroupBlock } from "./group-block";
import { fetchGroups } from "@/lib/requests/data";

export async function Groups() {
  const groups = await fetchGroups();

  return (
    <section>
      <h1 className="font-bold">Groups</h1>
      <p>The following groups have been created.</p>

      <div className="mt-4">
        <CreateGroup />
      </div>

      <div className="p-4 mt-4 rounded-md bg-slate-100">
        {groups.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">
            {groups.map((g: Group) => (
              <GroupBlock group={g} key={g.id} />
            ))}
          </ul>
        ) : (
          <p>There are no created groups.</p>
        )}
      </div>
    </section>
  );
}
