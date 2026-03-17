import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { isAuthorizedUserAdmin } from "@/lib/utils";
import { UsersPage } from "@/components/admin/users/users-page";
import { Loader2 } from "lucide-react";

export default async function Page() {
  const user = await getCurrentUser();

  if (!user || !isAuthorizedUserAdmin(user.roles)) return notFound();

  return (
    <div className="mx-auto w-full px-[100px]">
      <div className="mt-4 mb-2 px-4 pt-4 pb-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl dark:text-slate-100">
          Users
        </h1>
        <p className="mt-1 text-lg text-slate-600 dark:text-slate-400">
          Manage platform users and their roles.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        }
      >
        <UsersPage />
      </Suspense>
    </div>
  );
}
