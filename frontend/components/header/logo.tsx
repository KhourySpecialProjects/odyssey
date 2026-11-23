import Image from "next/image";

// Both variants are rendered and toggled with Tailwind's class-based dark mode
// (next-themes sets `class="dark"` on <html>), so the logo is in the server
// HTML instead of appearing after hydration. The dark variant uses `block` to
// match the light one (Tailwind's preflight makes images display: block).
export function Logo({ width, height }: { width: number; height: number }) {
  return (
    <>
      <Image
        src="/logo.png"
        alt="Khoury Odyssey Logo"
        width={width}
        height={height}
        priority
        className="dark:hidden"
      />
      <Image
        src="/logo_dark.png"
        alt="Khoury Odyssey Logo"
        width={width}
        height={height}
        priority
        className="hidden dark:block"
      />
    </>
  );
}
