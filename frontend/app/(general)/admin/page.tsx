import { authOptions } from "@/lib/authOptions";
import Session from "@/ui/admin/session";
import AuthorizedUsers from "@/ui/admin/users/authorized-users";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.isAdmin) return notFound();

  return (
    <div className="w-full max-w-5xl p-8 mx-auto space-y-12">
      <Session />
      <AuthorizedUsers />
    </div>
  );
}
