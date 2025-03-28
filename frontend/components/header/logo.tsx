"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function Logo({ width, height }: { width: number; height: number }) {
  const [theme, setTheme] = useState<string | null>(null);

  useEffect(() => {
    setTheme(
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light",
    );
  }, []);

  const image = theme === "dark" ? "/logo_dark.png" : "/logo.svg";

  if (!theme) return null;
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
