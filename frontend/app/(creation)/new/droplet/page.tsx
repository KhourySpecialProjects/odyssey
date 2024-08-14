import { getTags } from "@/lib/requests/tag";
import { CreateDropletForm } from "@/components/new/new-droplet-form";
import { Suspense } from "react";
import { LoaderCircleIcon } from "lucide-react";

export default async function CreateDroplet() {
  const tags = await getTags({ fields: ["name", "slug"] });
  return (
    <Suspense
      fallback={
        <LoaderCircleIcon className="w-52 h-52 text-slate-200 animate-spin" />
      }
    >
      <CreateDropletForm tags={tags} />
    </Suspense>
  );
}
