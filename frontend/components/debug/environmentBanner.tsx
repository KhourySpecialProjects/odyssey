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
        "relative py-1 z-10 w-full flex items-center p-2 text-xs uppercase font-mono font-medium text-white bg-red-800",
        className,
      )}
    >
      <p className="absolute left-1/2 transform -translate-x-1/2">
        &lt; {app_env} ENVIRONMENT &gt;
      </p>

      <div className="ml-auto">
        <ReportBugButton user={user} />
      </div>
    </div>
  );
}
