import { SettingsNavigation } from "@/components/settings/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { NavItem } from "@/types";
import { notFound } from "next/navigation";
import { PencilIcon, UsersIcon, StickyNoteIcon } from "lucide-react";

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
      icon: <PencilIcon className="h-4 w-4" />,
    },
    {
      href: "/settings/friends",
      label: "Friends",
      icon: <UsersIcon className="h-4 w-4" />,
    },
    {
      href: "/settings/notes",
      label: "Notes",
      icon: <StickyNoteIcon className="h-4 w-4" />,
    },
  ];

  return (
    <div className="flex min-h-screen">
      <SettingsNavigation items={navItems} />
      <main className="min-w-0 flex-1 overflow-auto bg-white px-4 pt-4 pb-8 md:px-12 md:pt-8 md:pb-16 md:pl-80 dark:bg-zinc-950">
        {children}
      </main>
    </div>
  );
}
