import { CreateDroplet } from "./create-droplet";
import { fetchDroplets } from "@/lib/requests/data";
import { DropletClient } from "./droplet-client";

export async function Droplets() {
  const droplets = await fetchDroplets();

  return (
    <section>
      <h1 className="font-bold dark:text-slate-300">Droplets</h1>
      <p className="dark:text-slate-300">
        The following droplets have been created.
      </p>

      <div className="mt-4">
        <CreateDroplet />
      </div>
      <DropletClient droplets={droplets}></DropletClient>
    </section>
  );
}
