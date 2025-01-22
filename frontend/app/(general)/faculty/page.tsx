import { AccessManager } from "@/components/shared/access-manager/access-manager";
import { Session } from "@/components/shared/session";
import { AdminSelector } from "@/components/shared/selector";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { isAuthorizedUserAdmin } from "@/lib/utils";
import { StudentProgress } from "@/components/admin/progress/student-progress";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user || !isAuthorizedUserAdmin(user.roles)) return notFound();

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="w-full p-8 mx-auto my-4 text-center max-w-7xl">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Faculty
        </h1>
      </div>
      <Session />
      <AdminSelector
        content={{
          "Access Manager": <AccessManager user={user} />,
          "Student Progress": <StudentProgress />,
        }}
      />
    </div>
  );
}
