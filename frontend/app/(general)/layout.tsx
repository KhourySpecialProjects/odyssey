import AccessRequestBanner from "@/components/access-request-banner";
import { DebugBanner } from "@/components/debug-banner";
import Header from "@/components/header";
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

      <div className="h-[4.5rem]"></div>

      <Suspense>
        <AccessRequestBanner />
      </Suspense>

      <DebugBanner />
      <main>{children}</main>
    </>
  );
}
