import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PHProvider } from "@/providers/PHProvider";
import AuthSessionProvider from "@/providers/SessionProvider";
import { NuqsAdapter } from "nuqs/adapters/react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { FirstVisitPopupLoader } from "@/components/first-time/first-visit-popup-loader";
import { ThemeClientProvider } from "@/components/theme.client.provider";
import AccessRequestBanner from "@/components/requests/access-request-banner";
import { EnvironmentBanner } from "@/components/debug/environmentBanner";
import Footer from "@/components/footer/page";
import { Suspense } from "react";
import { HeaderWrapper } from "@/components/header/header-wrapper";

const inter = Inter({
  subsets: ["latin"],
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
    <html lang="en" suppressHydrationWarning>
      <link rel="icon" href="/icon.svg" type="image/svg+xml" sizes="any" />
      <body className={inter.className} suppressHydrationWarning>
        <ThemeClientProvider>
          <AuthSessionProvider>
            <PHProvider>
              <TooltipProvider delayDuration={250}>
                <NuqsAdapter>
                  <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900 focus:shadow-lg focus:ring-2 focus:ring-sky-700 focus:outline-none dark:focus:bg-slate-900 dark:focus:text-white"
                  >
                    Skip to main content
                  </a>
                  <div className="flex min-h-screen flex-col">
                    <div className="sticky top-0 z-50">
                      <EnvironmentBanner />
                      <Suspense>
                        <HeaderWrapper />
                      </Suspense>

                      <Suspense>
                        <AccessRequestBanner />
                      </Suspense>
                    </div>

                    <main
                      id="main-content"
                      tabIndex={-1}
                      className="flex-grow focus:outline-none"
                    >
                      {children}
                    </main>
                    <Footer />
                  </div>
                  <Suspense fallback={null}>
                    <FirstVisitPopupLoader />
                  </Suspense>
                </NuqsAdapter>
              </TooltipProvider>
            </PHProvider>
          </AuthSessionProvider>
          <Toaster />
        </ThemeClientProvider>
      </body>
    </html>
  );
}
