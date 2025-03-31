"use client";

import { useTheme } from "next-themes";
import Image from "next/image";
import { useEffect, useState } from "react";

export function Logo({ width, height }: { width: number; height: number }) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Wait until mounted to avoid hydration mismatch
  if (!mounted) return null;

  const image =
    theme === "dark" || resolvedTheme === "dark"
      ? "/logo_dark.png"
      : "/logo.svg";

  return (
    <Image
      src={image}
      alt="Khoury Odyssey Logo"
      width={width}
      height={height}
      priority
    />
  );
}
