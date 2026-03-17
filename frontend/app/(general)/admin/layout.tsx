import { AdminNav } from "@/components/admin/admin-nav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="min-w-0 flex-1 overflow-auto">{children}</main>
    </div>
  );
}
