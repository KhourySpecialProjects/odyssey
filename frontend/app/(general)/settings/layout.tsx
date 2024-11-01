import { SettingsNavigation } from "@/components/settings/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorByAuthorizedUserEmail } from "@/lib/requests/author";
import { NavItem } from "@/types";
import { notFound } from "next/navigation";

export default async function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  if (!user?.email) return notFound();
  const author = await getAuthorByAuthorizedUserEmail(user.email);

  const navItems: NavItem[] = [
    {
      href: "/settings",
      label: "General",
    },
    {
      href: "/settings/profile",
      label: "Author Profile",
      isHidden: !author,
    },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-screen gap-4 p-4 bg-slate-50 md:gap-8 md:p-10">
      <div className="grid w-full max-w-6xl gap-2 mx-auto">
        <h1 className="text-3xl font-bold">
          {/* {navItems.find((section) => section.href === pathname)?.label}{" "} */}
          Settings
        </h1>
      </div>

      <div className="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
        <SettingsNavigation items={navItems} />

        <div className="grid gap-6">{children}</div>
      </div>
    </div>
  );
}
