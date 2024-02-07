import AuthSessionProvider from "@/providers/SessionProvider";
import DebugToggle from "@/ui/debug-toggle";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className}>
        <AuthSessionProvider>
          {children}
          <DebugToggle />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
