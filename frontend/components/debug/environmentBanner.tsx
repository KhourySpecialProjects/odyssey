import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { RoleSwitcher } from "./role-switcher";

export async function EnvironmentBanner({ className }: { className?: string }) {
  const app_env = process.env.NEXT_PUBLIC_APP_ENV;
  if (app_env === "production") return null;

  const isDev = process.env.NODE_ENV === "development";
  const user = isDev ? await getCurrentUser() : null;
  const rawLabel = isDev
    ? (await cookies()).get("dev-role-label")?.value ?? null
    : null;
  const activePersona = rawLabel ? decodeURIComponent(rawLabel) : null;

  return (
    <div
      className={cn(
        "relative z-[51] flex w-full items-center justify-between bg-red-800 p-2 py-1 font-mono text-xs font-medium text-white uppercase",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {user && (
          <RoleSwitcher
            currentRoles={user.roles}
            activePersona={activePersona}
          />
        )}
      </div>

      <p className="pointer-events-none flex-1 text-center">
        &lt; {app_env} ENVIRONMENT &gt;
      </p>
    </div>
  );
}
