import { CreateDroplet } from "@/components/new/new-droplet";
import { setProbeLabel } from "@/lib/perf/probe";

export default async function CreateDropletRoute() {
  setProbeLabel("/new/droplet");
  return (
    <div className="bg-white px-4 pt-4 pb-8 md:px-[300px] md:pt-8 md:pb-16 dark:bg-zinc-950">
      <CreateDroplet data-testid="create-droplet" />
    </div>
  );
}
