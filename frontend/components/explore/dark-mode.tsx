"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function DarkMode({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }
  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`relative flex h-8 w-8 items-center rounded-full bg-yellow-300 p-1 transition-colors dark:bg-sky-600 ${className}`}
    >
      <Moon
        className={`transition-scale absolute left-1 h-6 w-6 text-gray-900 duration-500 ease-in-out ${isDark ? "" : "scale-0"}`}
      />

      <Sun
        className={`transition-scale absolute right-1 h-6 w-6 text-gray-600 duration-500 ease-in-out ${isDark ? "scale-0" : ""}`}
      />
    </button>
  );
}
