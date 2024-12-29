import DebugToggle from "@/components/debug/toggle";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PHProvider } from "@/providers/PHProvider";
import AuthSessionProvider from "@/providers/SessionProvider";
import { NuqsAdapter } from "nuqs/adapters/react";
import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";

const lato = Lato({
  subsets: ["latin-ext"],
  weight: ["100", "300", "400", "700", "900"],
});

export const metadata: Metadata = {
  metadataBase: process.env.APP_URL ? new URL(process.env.APP_URL) : null,
  title: {
    absolute: "Khoury Odyssey",
    template: "%s | Khoury Odyssey",
  },
  description:
    "Khoury Odyssey is a new platform designed to provide on-demand access to modern knowledge and skills pertinent to today’s undergraduate Khoury students.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <link
        rel="icon"
        href="/icon.svg"
        type="image/svg+xml"
        sizes="any"
      />
      <body className={lato.className}>
        <AuthSessionProvider>
          <PHProvider>
            <TooltipProvider delayDuration={250}>
              <NuqsAdapter>{children}</NuqsAdapter>
              <DebugToggle />
            </TooltipProvider>
          </PHProvider>
        </AuthSessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
