import { CreateDropletForm } from "./new-droplet-form";
import { getTags } from "@/lib/requests/tag";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { isAuthorizedUserAdmin, isContentCreator } from "@/lib/utils";

export async function CreateDroplet() {
  const user = await getCurrentUser();
  if (
    !user ||
    (!isContentCreator(user.roles) && !isAuthorizedUserAdmin(user.roles))
  )
    return notFound();
  const tags = await getTags({ fields: ["name", "slug"] });

  return (
    <div className="light:bg-slate-100 flex w-full flex-col items-center justify-center px-24">
      <h1 className="mb-7 text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
        Create a Droplet
      </h1>
      <CreateDropletForm tags={tags} author={user} />
    </div>
  );
}
