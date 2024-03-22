import AccessRequests from "@/components/admin/access-requests/access-requests";
import Session from "@/components/admin/session";
import AuthorizedUsers from "@/components/admin/users/authorized-users";
import { authOptions } from "@/lib/auth/options";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.isAdmin) return notFound();

  return (
    <div className="w-full max-w-5xl p-8 mx-auto space-y-12">
      <Session />
      <AccessRequests />
      <AuthorizedUsers />
    </div>
  );
}
