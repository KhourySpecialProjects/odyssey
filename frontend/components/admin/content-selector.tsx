"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { name: "Access Requests", href: "/admin" },
  { name: "Student Progress", href: "/admin/progress" },
  { name: "Reports", href: "/admin/reports" },
];

export function ContentSelector() {
  const pathname = usePathname();

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <Link
            key={tab.name}
            href={tab.href}
            className={cn(
              pathname === tab.href
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
              "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium",
            )}
          >
            {tab.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}
