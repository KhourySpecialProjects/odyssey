"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export function DarkMode({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "relative h-7 w-12 rounded-full bg-white/20 transition-colors hover:bg-white/30",
        className,
      )}
    >
      <div
        className={cn(
          "absolute top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-300",
          isDark ? "translate-x-5" : "translate-x-0.5",
        )}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5 text-slate-600" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-yellow-500" />
        )}
      </div>
    </button>
  );
}
