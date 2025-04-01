import { CreateDroplet } from "@/components/new/new-droplet";

export default async function CreateDropletRoute() {
  return (
    <div className="relative light:bg-slate-100 isolate px-6 py-12 sm:py-16 lg:px-8">
      <CreateDroplet data-testid="create-droplet" />
    </div>
  );
}
