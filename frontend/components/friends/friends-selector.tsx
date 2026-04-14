"use client";

import { cn } from "@/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function FriendsSelector({
  friends,
  recieved_requests,
  suggestions,
  sent_requests,
  blocked,
}: {
  friends: number;
  recieved_requests: number;
  suggestions: number;
  sent_requests: number;
  blocked: number;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const currentTab = searchParams.get("tab") || "friends";

  const tabs = [
    { name: "Friends", count: friends, value: "friends" },
    { name: "Requests", count: recieved_requests, value: "recieved_requests" },
    { name: "Suggestions", count: suggestions, value: "suggestions" },
    { name: "Sent", count: sent_requests, value: "sent_requests" },
    { name: "Blocked", count: blocked, value: "blocked" },
  ];

  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(name, value);
    return params.toString();
  };

  return (
    <>
      {/* Mobile: select dropdown */}
      <div className="md:hidden">
        <select
          className="w-full rounded-md border border-[#D0D5DD] px-3 py-2 text-sm focus:ring-2 focus:ring-[#287697] focus:outline-none dark:border-slate-700 dark:bg-black dark:text-white"
          value={currentTab}
          onChange={(e) => {
            router.push(
              `${pathname}?${createQueryString("tab", e.target.value)}`,
            );
          }}
        >
          {tabs.map((tab) => (
            <option key={`tab-${tab.value}`} value={tab.value}>
              {tab.name} ({tab.count})
            </option>
          ))}
        </select>
      </div>

      {/* Desktop: pill tabs */}
      <div className="hidden gap-2 md:flex">
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
            {tab.name} ({tab.count})
          </button>
        ))}
      </div>
    </>
  );
}
