import { SettingsNavigation } from "@/components/settings/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { NavItem } from "@/types";
import { notFound } from "next/navigation";

export default async function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  if (!user?.email) return notFound();

  const navItems: NavItem[] = [
    {
      href: "/settings",
      label: "General",
    },
    {
      href: "/settings/friends",
      label: "Friends",
    },
    {
      href: "/settings/notes",
      label: "Notes",
    },
  ];

  return (
    <div className="flex min-h-screen flex-1 flex-col gap-4 bg-slate-50 p-4 md:gap-8 md:p-10 dark:bg-slate-950">
      <div className="mx-auto grid w-full max-w-6xl items-start gap-6 pt-8 md:grid-cols-[180px_1fr] lg:grid-cols-[150px_1fr]">
        <SettingsNavigation items={navItems} />

        <div className="grid gap-6">{children}</div>
      </div>
    </div>
  );
}
