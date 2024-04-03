"use client";

import { cn } from "@/lib/utils";
import { NavItem } from "@/types";
import Link from "next/link";
import { usePathname } from "next/navigation";

const settingSections: NavItem[] = [
  {
    href: "/settings",
    label: "General",
  },
  {
    href: "/settings/profile",
    label: "Author Profile",
  },
];

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col flex-1 min-h-screen gap-4 p-4 bg-slate-50 md:gap-8 md:p-10">
      <div className="grid w-full max-w-6xl gap-2 mx-auto">
        <h1 className="text-3xl font-bold">
          {settingSections.find((section) => section.href === pathname)?.label}{" "}
          Settings
        </h1>
      </div>

      <div className="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
        <nav className="grid gap-4 text-sm text-slate-500">
          {settingSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className={cn(
                "font-semibold",
                pathname == section.href && "text-sky-600"
              )}
            >
              {section.label}
            </Link>
          ))}
        </nav>

        <div className="grid gap-6">{children}</div>
      </div>
    </div>
  );
}
