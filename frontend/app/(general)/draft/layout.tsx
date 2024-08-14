import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create",
  description: "Share your experience to the other users on Odyssey.",
};

export default function CreateRouteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <main>{children}</main>;
}
