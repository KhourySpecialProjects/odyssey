import AccessRequestBanner from "@/components/access-request-banner";
import { DebugBanner } from "@/components/debug/banner";
import { Header } from "@/components/header";
import { Suspense } from "react";

export default function GeneralLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <DebugBanner />

      <Suspense>
        <Header />
      </Suspense>

      <Suspense>
        <AccessRequestBanner />
      </Suspense>
      <main>{children}</main>
    </>
  );
}
