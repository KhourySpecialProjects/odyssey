"use client";

import { cn } from "@/lib/utils";
import {
  CircleUserIcon,
  PlusCircleIcon,
  ShieldIcon,
  StarIcon,
  UserIcon,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button"

const tabs = [
  { name: "Favs", value: "favorites", icon: StarIcon },
  { name: "Created", value: "creator", icon: PlusCircleIcon },
  { name: "Admin", value: "admin", icon: ShieldIcon },
  { name: "Manager", value: "manager", icon: CircleUserIcon },
  { name: "Member", value: "member", icon: UserIcon },
];

export function GroupsSelector() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const currentTab = searchParams.get("tab") || "favorites";

  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(name, value);
    return params.toString();
  };
  // TODO: Break this tabbed UI setup into its own reusable component. We are using it in a few different
  // places and it would be nice to abstract it out. 
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              router.push(`${pathname}?${createQueryString("tab", tab.value)}`);
            }}
            className={cn(
              tab.value === currentTab
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
              "whitespace-nowrap border-b-2 py-4 px-1 text-base font-medium flex items-center gap-2"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.name}
          </button>
        ))}
      </nav>
    </div>
  );
}
