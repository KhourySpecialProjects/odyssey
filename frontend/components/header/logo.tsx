"use client";

import Image from "next/image";
import { useTheme } from "next-themes";

export function Logo({ width, height }: { width: number; height: number }) {
  const { theme, setTheme } = useTheme();
  const image = theme === "dark" ? "/logo_dark.png" : "/logo.svg";
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
