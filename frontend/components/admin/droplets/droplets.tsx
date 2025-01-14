import { DropletBlock } from "./droplet-block";
import { CreateDroplet } from "./create-droplet";
import { fetchDroplets } from "@/lib/requests/data";
import { Droplet } from "@/types"

export async function Droplets() {
  const droplets = await fetchDroplets();

  return (
    <section>
      <h1 className="font-bold">Droplets</h1>
      <p>The following droplets have been created.</p>

      <div className="mt-4">
        <CreateDroplet />
      </div>

      <div className="p-4 mt-4 rounded-md bg-slate-100">
        {droplets.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">
            {droplets.map((d : Droplet) => (
              <DropletBlock droplet={d} key={d.id} />
            ))}
          </ul>
        ) : (
          <p>There are no created droplets.</p>
        )}
      </div>
    </section>
  );
}
