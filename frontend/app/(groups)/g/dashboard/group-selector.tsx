"use client";

import { cn, isAuthorizedUserAdmin } from "@/lib/utils";
import { PlusIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { isContentCreator, isAuthorizedUserFaculty } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useMemo } from "react";

const baseTabs = [
  { name: "Member", value: "member" },
  { name: "Admin", value: "admin" },
];

export function GroupsSelector() {
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
        ? [...baseTabs, { name: "Creator", value: "creator" }]
        : baseTabs,
    [canCreateGroup],
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              router.push(`${pathname}?${createQueryString("tab", tab.value)}`);
            }}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              tab.value === currentTab
                ? "border-[#287697] bg-[#287697] text-white"
                : "border-[#D0D5DD] text-[#667085] hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800",
            )}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {canCreateGroup && (
        <Button
          size="sm"
          after={<PlusIcon />}
          onClick={() => router.push("/g/management")}
          className="bg-[#287697] text-white hover:bg-[#1f6080]"
        >
          Create Group
        </Button>
      )}
    </div>
  );
}
