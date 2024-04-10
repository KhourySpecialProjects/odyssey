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

      <div className="z-10 sticky top-0">
        <Suspense>
          <Header />
        </Suspense>

        <Suspense>
          <AccessRequestBanner />
        </Suspense>
      </div>

      <main>{children}</main>
    </>
  );
}
