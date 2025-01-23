import AccessRequestBanner from "@/components/access-request-banner";
import { DebugBanner } from "@/components/debug/debugBanner";
import { EnvironmentBanner } from "@/components/debug/environmentBanner";
import Footer from "@/components/footer/page"
import { Header } from "@/components/header";
import { Suspense } from "react";

export default function GeneralLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
    <DebugBanner />
    <EnvironmentBanner />

    <div className="sticky top-0 z-10">
      <Suspense>
        <Header />
      </Suspense>
    </div>

    <main className="flex-grow">{children}</main>

    <Footer />
  </div>
  );
}
