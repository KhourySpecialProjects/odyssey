import AuthSessionProvider from "@/providers/SessionProvider";
import DebugToggle from "@/ui/debug-toggle";
import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";

const lato = Lato({ subsets: ["latin-ext"], weight: ["300", "400", "900"] });

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
      <body className={lato.className}>
        <AuthSessionProvider>
          {children}
          <DebugToggle />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
