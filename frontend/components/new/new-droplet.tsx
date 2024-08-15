import { CreateDropletForm } from "./new-droplet-form";
import { getTags } from "@/lib/requests/tag";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isContentCreator } from "@/lib/utils";

export async function CreateDroplet() {
  const user = await getCurrentUser();
  if (!user || !isContentCreator(user.roles)) return redirect("/");
  const tags = await getTags({ fields: ["name", "slug"] });

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-7">
        Create a Droplet
      </h1>
      <CreateDropletForm tags={tags} />
    </>
  );
}
