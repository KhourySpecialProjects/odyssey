import { AdminNav } from "@/components/admin/admin-nav";
import { AdminLoadingOverlay } from "@/components/admin/admin-loading-overlay";
import { getCurrentUser } from "@/lib/auth/session";
import { isAuthorizedUserAdmin } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user || !isAuthorizedUserAdmin(user.roles)) return notFound();

  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="min-w-0 flex-1 overflow-auto">
        <AdminLoadingOverlay>{children}</AdminLoadingOverlay>
      </main>
    </div>
  );
}
