import { CreateDroplet } from "@/components/new/new-droplet";

export default async function CreateDropletRoute() {
  return (
    <div className="bg-white px-4 pt-4 pb-8 md:px-[300px] md:pt-8 md:pb-16 dark:bg-zinc-950">
      <CreateDroplet data-testid="create-droplet" />
    </div>
  );
}
