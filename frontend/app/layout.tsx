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
import { USER_POPULATES } from "../lib/requests/user-populates";
import { ThemeClientProvider } from "@/components/theme.client.provider";
import AccessRequestBanner from "@/components/requests/access-request-banner";
import { EnvironmentBanner } from "@/components/debug/environmentBanner";
import Footer from "@/components/footer/page";
import { Suspense } from "react";
import { HeaderWrapper } from "@/components/header/header-wrapper";

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
      authorizedUser = await getAuthorizedUserByEmail(
        user.email,
        USER_POPULATES.profile,
      );
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
                    <div className="sticky top-0 z-50">
                      <EnvironmentBanner />
                      <Suspense>
                        <HeaderWrapper />
                      </Suspense>

                      <Suspense>
                        <AccessRequestBanner />
                      </Suspense>
                    </div>

                    <main className="flex-grow">{children}</main>
                    <div className="scale-x-80 md:scale-x-100">
                      <Footer />
                    </div>
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
