"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

import { Classic } from "@theme-toggles/react";

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
      className={`relative flex items-center w-8 h-8 bg-yellow-300 dark:bg-sky-600 rounded-full p-1 transition-colors ${className}`}
    >
      <Moon
        className={`absolute left-1 w-6 h-6 text-gray-900 transition-scale duration-500 ease-in-out ${isDark ? "" : "scale-0"}`}
      />

      <Sun
        className={`absolute right-1 w-6 h-6 text-gray-600 transition-scale duration-500 ease-in-out ${isDark ? "scale-0" : ""}`}
      />
    </button>
  );
}
