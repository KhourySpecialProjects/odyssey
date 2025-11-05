"use client";

import { cn, isAuthorizedUserAdmin } from "@/lib/utils";
import {
  Plus,
  PlusCircle,
  PlusCircleIcon,
  ShieldIcon,
  UserIcon,
  UsersRound,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { isContentCreator, isAuthorizedUserFaculty } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";

const baseTabs = [
  { name: "Member", value: "member", icon: UserIcon },
  { name: "Admin", value: "admin", icon: ShieldIcon },
  // { name: "Manager", value: "manager", icon: CircleUserIcon },
  // { name: "Favorites", value: "favorites", icon: FavoriteBorderIcon },
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

  return (
    <div className="relative flex items-center justify-between border-b border-gray-200 pb-1">
      <button
        onClick={() => setMenuExpanded(!menuExpanded)}
        className={`block md:hidden ${menuExpanded ? "rounded-md bg-slate-300 dark:bg-slate-600" : ""}`}
      >
        <div className="rounded-md border border-slate-300 p-2">
          <UsersRound className="h-6 w-6" />
        </div>
      </button>

      <Badge className="md:hidden">
        {currentTab.substring(0, 1).toUpperCase() + currentTab.substring(1)}
      </Badge>

      <div
        className={cn(
          "absolute rounded-md border border-slate-200 bg-slate-50 px-5 pb-5 dark:border-slate-500 dark:bg-slate-800",
          "feed-mobile-filters z-10 overflow-y-hidden",
          menuExpanded
            ? "visibility: visible bottom-0 translate-y-[100%]"
            : "visibility: hidden",
        )}
      >
        <nav
          className="-mb-px flex flex-col sm:flex-row sm:space-x-8"
          aria-label="Tabs"
        >
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setMenuExpanded(false);
                router.push(
                  `${pathname}?${createQueryString("tab", tab.value)}`,
                );
              }}
              className={cn(
                tab.value === currentTab
                  ? "border-primary-500 light:text-primary-600 dark:text-primary-300"
                  : "light:text-gray-500 border-transparent hover:border-gray-300 hover:text-gray-700 dark:text-slate-300 dark:hover:text-gray-400",
                "border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap",
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      <nav
        className="-mb-px hidden flex-row space-x-8 md:flex"
        aria-label="Tabs"
      >
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
                : "light:text-gray-500 border-transparent hover:border-gray-300 hover:text-gray-700 dark:text-slate-300 dark:hover:text-gray-400",
              "flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap",
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
          className="px-2 py-1 md:px-4 md:py-2 lg:mr-4"
        >
          <PlusCircle className="mr-2 hidden h-4 w-4 md:block" />
          <Plus className="h-5 w-6 md:hidden" />
          <p className="hidden md:block">Create Group</p>
        </Button>
      )}
    </div>
  );
}
