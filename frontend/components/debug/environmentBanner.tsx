import {cn} from "@/lib/utils";

export function EnvironmentBanner({ className }: {className?: string }) {
    const app_env = process.env.NEXT_PUBLIC_APP_ENV;
    if (app_env === "production") return null;

    return (
        <div
            className={cn(
                "relative py-1 z-10 w-full text-center text-xs uppercase font-mono font-medium text-white bg-red-800",
                className,
            )}
        >
            <p className="inline-flex flex-row items-center gap-2">
                &lt; {app_env} ENVIRONMENT &gt;
            </p>
        </div>
    );
}