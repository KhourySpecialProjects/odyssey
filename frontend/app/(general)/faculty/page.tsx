import { AccessManager } from "@/components/shared/access-manager/access-manager";
import { AdminSelector } from "@/components/shared/selector";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { isAuthorizedUserFaculty } from "@/lib/utils";
import { AuthorizedUsers } from "@/components/admin/users/authorized-users";
import { Droplets } from "@/components/admin/droplets/droplets";
import { Playlists } from "@/components/admin/playlists/playlists";
import { Reports } from "@/components/admin/reports/reports";
import { Groups } from "@/components/admin/groups/groups";

export default async function Page() {
  const user = await getCurrentUser();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (!user || !isAuthorizedUserFaculty(user.roles)) return notFound();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mx-auto my-4 w-full max-w-7xl p-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Faculty
        </h1>
      </div>
      {/* <Session /> */}
      <AdminSelector
        content={{
          Users: <AuthorizedUsers />,
          Droplets: <Droplets />,
          Playlists: <Playlists />,
          Groups: <Groups />,
          "Access Manager": <AccessManager user={user} />,
          Reports: <Reports />,
        }}
      />
    </div>
  );
}
