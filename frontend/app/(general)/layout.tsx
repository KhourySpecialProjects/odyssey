import AccessRequestBanner from "@/ui/access-request-banner";
import { DebugBanner } from "@/ui/debug-banner";
import Header from "@/ui/header";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Khoury Odyssey",
  description: "",
};

export default function GeneralLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Suspense>
        <Header />
      </Suspense>

      <div className="h-[4.25rem]"></div>

      <Suspense>
        <AccessRequestBanner />
      </Suspense>

      <DebugBanner />
      <main>{children}</main>
    </>
  );
}
