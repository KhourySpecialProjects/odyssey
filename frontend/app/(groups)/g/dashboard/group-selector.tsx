"use client";

import { cn, isAuthorizedUserAdmin } from "@/lib/utils";
import {
  AlignJustify,
  BellRing,
  CircleUserIcon,
  Plus,
  PlusCircle,
  PlusCircleIcon,
  ShieldIcon,
  StarIcon,
  UserIcon,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { isContentCreator, isAuthorizedUserFaculty } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { FeedFilter } from "@/components/feed/feed-filter";

const baseTabs = [
  { name: "Member", value: "member", icon: UserIcon },
  { name: "Admin", value: "admin", icon: ShieldIcon },
  { name: "Manager", value: "manager", icon: CircleUserIcon },
  // { name: "Favs", value: "favorites", icon: StarIcon },
];

export function GroupsSelector() {
  const [menuExpanded, setMenuExpanded] = useState(false);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const canCreateGroup =
    session?.user?.roles &&
    (isContentCreator(session.user.roles) ||
      isAuthorizedUserAdmin(session.user.roles) ||
      isAuthorizedUserFaculty(session.user.roles));

  const currentTab = searchParams.get("tab") || "member";

  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(name, value);
    return params.toString();
  };

  const tabs = useMemo(
    () =>
      canCreateGroup
        ? [
          { name: "Creator", value: "creator", icon: PlusCircleIcon },
          ...baseTabs,
        ]
        : baseTabs,
    [canCreateGroup],
  );


  // TODO: Break this tabbed UI setup into its own reusable component. We are using it in a few different
  // places and it would be nice to abstract it out.
  return (
    <div className="border-b border-gray-200 flex items-center justify-between relative pb-1">


      <button
        onClick={() => setMenuExpanded(!menuExpanded)}
        className={`block md:hidden ${menuExpanded ? "bg-slate-300 rounded-md p-1 dark:bg-slate-600" : "p-1"}`}
      >
        <AlignJustify className="w-6 h-6" />
      </button>

      <div
        className={cn(
          "absolute px-5 pb-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-500 rounded-md",
          "z-10 overflow-y-hidden feed-mobile-filters",
          menuExpanded
            ? "bottom-0 translate-y-[100%] visibility: visible "
            : "visibility: hidden",
        )}
      >
        <nav className="-mb-px flex flex-col sm:flex-row sm:space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setMenuExpanded(false);
                router.push(`${pathname}?${createQueryString("tab", tab.value)}`);
              }}
              className={cn(
                tab.value === currentTab
                  ? "border-primary-500 light:text-primary-600 dark:text-primary-300"
                  : "border-transparent light:text-gray-500 dark:text-slate-300 dark:hover:text-gray-400 hover:border-gray-300 hover:text-gray-700",
                "whitespace-nowrap border-b-2 py-4 px-1 text-base font-medium flex items-center gap-2",
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>


      <nav className="-mb-px flex flex-row space-x-8 hidden md:flex" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setMenuExpanded(false);
                router.push(`${pathname}?${createQueryString("tab", tab.value)}`);
              }}
              className={cn(
                tab.value === currentTab
                  ? "border-primary-500 light:text-primary-600 dark:text-primary-300"
                  : "border-transparent light:text-gray-500 dark:text-slate-300 dark:hover:text-gray-400 hover:border-gray-300 hover:text-gray-700",
                "whitespace-nowrap border-b-2 py-4 px-1 text-base font-medium flex items-center gap-2",
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
            </button>
          ))}
        </nav>




      {canCreateGroup && (
        <Button
          variant="default"
          size="sm"
          onClick={() => router.push("/g/management")}
          className="lg:mr-4 px-2 py-1 md:px-4 md:py-2"
        >
          <PlusCircle className="h-4 w-4 mr-2 hidden md:block" />
          <Plus className="h-5 w-6 md:hidden"/>
          <p className="hidden md:block">Create Group</p>
        </Button>
      )}

    </div>
  );
}
