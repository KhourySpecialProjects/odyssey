"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function DarkMode({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }
  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative flex h-8 w-16 items-center rounded-full bg-yellow-300 p-1 transition-colors dark:bg-sky-600 ${className}`}
    >
      <Moon
        aria-hidden="true"
        className={`transition-scale absolute left-2 h-5 w-5 text-gray-900 duration-500 ease-in-out ${isDark ? "translate-x-0" : "translate-x-7 scale-0 opacity-0"}`}
      />

      <Sun
        aria-hidden="true"
        className={`transition-scale absolute right-2 h-5 w-5 text-gray-900 duration-500 ease-in-out ${isDark ? "translate-x-7 scale-0 opacity-0" : "translate-x-0"}`}
      />
      <div
        className={`absolute left-1 h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${isDark ? "translate-x-8" : "translate-x-0"}`}
      />
    </button>
  );
}
