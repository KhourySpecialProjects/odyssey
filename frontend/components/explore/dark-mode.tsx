"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function DarkMode() {
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
      className="relative flex items-center w-14 h-8 bg-gray-700 dark:bg-sky-600 rounded-full p-1 transition-colors"
    >
      <Moon
        className={`absolute left-2 w-5 h-5 text-gray-900 transition-transform ${isDark ? "translate-x-0" : "translate-x-7 opacity-0"}`}
      />

      <Sun
        className={`absolute right-2 w-5 h-5 text-yellow-200 transition-transform ${isDark ? "translate-x-7 opacity-0" : "translate-x-0"}`}
      />

      <div
        className={`absolute left-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${isDark ? "translate-x-6" : "translate-x-0"}`}
      />
    </button>
  );
}
