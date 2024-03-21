import { Toaster } from "@/components/ui/toaster";
import AuthSessionProvider from "@/providers/SessionProvider";
import DebugToggle from "@/components/debug-toggle";
import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";

const lato = Lato({
  subsets: ["latin-ext"],
  weight: ["100", "300", "400", "700", "900"],
});

export const metadata: Metadata = {
  title: "Khoury Odyssey",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={lato.className}>
        <AuthSessionProvider>
          {children}
          <DebugToggle />
          <Toaster />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
