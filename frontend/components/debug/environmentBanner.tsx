import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth/session";
import { ReportBugButton } from "./reportBugButton";

export async function EnvironmentBanner({ className }: { className?: string }) {
  const app_env = process.env.NEXT_PUBLIC_APP_ENV;
  const user = await getCurrentUser();
  if (app_env === "production") return null;

  return (
    <div
      className={cn(
        "relative z-50 flex w-full items-center bg-red-800 p-2 py-1 font-mono text-xs font-medium text-white uppercase",
        className,
      )}
    >
      <p className="absolute left-1/2 -translate-x-1/2 transform">
        &lt; {app_env} ENVIRONMENT &gt;
      </p>

      <div className="ml-auto">
        <ReportBugButton user={user} />
      </div>
    </div>
  );
}
