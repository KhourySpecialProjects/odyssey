import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PHProvider } from "@/providers/PHProvider";
import AuthSessionProvider from "@/providers/SessionProvider";
import { NuqsAdapter } from "nuqs/adapters/react";
import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import { FirstVisitPopup } from "@/components/first-time/first-visit-popup";
import { getCurrentUser } from "../lib/auth/session";
import { getAuthorizedUserByEmail } from "../lib/requests/authorized-user";
import { ThemeClientProvider } from "@/components/theme.client.provider";
import AccessRequestBanner from "@/components/access-request-banner";
import { EnvironmentBanner } from "@/components/debug/environmentBanner";
import Footer from "@/components/footer/page";
import { Header } from "@/components/header";
import { Suspense } from "react";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  let authorizedUser = null;

  if (user?.email) {
    try {
      authorizedUser = await getAuthorizedUserByEmail(user.email);
    } catch (error) {
      console.error("Error fetching authorized user:", error);
    }
  }
  return (
    <html lang="en" suppressHydrationWarning>
      <link rel="icon" href="/icon.svg" type="image/svg+xml" sizes="any" />
      <body className={lato.className}>
        <ThemeClientProvider>
          <AuthSessionProvider>
            <PHProvider>
              <TooltipProvider delayDuration={250}>
                <NuqsAdapter>
                <div className="flex min-h-screen flex-col">
                    <EnvironmentBanner />
                    
                    <div className="z-10 sticky top-0">
                      <Suspense>
                        <Header />
                      </Suspense>

                      <Suspense>
                        <AccessRequestBanner />
                      </Suspense>
                    </div>

                    <main className="flex-grow">{children}</main>
                    <Footer />
                  </div>
                  <FirstVisitPopup user={authorizedUser} />
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
