import { AccessRequests } from "@/components/admin/access-requests/access-requests";
import { Reports } from "@/components/admin/reports/reports";
import { Session } from "@/components/admin/session";
import { AdminSelector } from "@/components/admin/selector";
import { AuthorizedUsers } from "@/components/admin/users/authorized-users";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { isAuthorizedUserAdmin } from "@/lib/utils";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user || !isAuthorizedUserAdmin(user.roles)) return notFound();

  return (
    <div className="w-full max-w-5xl p-8 mx-auto space-y-12">
      <Session />
      <AdminSelector
        content={{
          "Authorized Users": <AuthorizedUsers />,
          "Access Requests": <AccessRequests />,
          Reports: <Reports />,
        }}
      />
    </div>
  );
}
