"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

import { Classic } from "@theme-toggles/react"

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
    <div className="flex items-center bg-emerald-300 h-full">
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative flex items-center w-7 h-7 bg-yellow-300 dark:bg-sky-600 rounded-full p-1 transition-colors"
    >
      <Classic duration={750} placeholder={undefined} onPointerEnterCapture={undefined} onPointerLeaveCapture={undefined}/>

      
    </button>
    </div>
  );
}
