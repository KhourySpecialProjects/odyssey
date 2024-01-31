import AuthSessionProvider from "@/providers/SessionProvider";
import { DebugBanner } from "@/ui/debug-banner";
import Header from "@/ui/header";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Droplets Proof of Concept",
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
          <Suspense>
            <Header />
          </Suspense>

          <div className="h-[4.25rem]"></div>

          <DebugBanner />

          <main>{children}</main>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
