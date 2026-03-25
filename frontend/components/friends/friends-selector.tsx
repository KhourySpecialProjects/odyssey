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
    { name: `Friends (${friends})`, value: "friends" },
    {
      name: `Friend Requests (${recieved_requests})`,
      value: "recieved_requests",
    },
    { name: `People You May Know (${suggestions})`, value: "suggestions" },
    { name: `Sent Requests (${sent_requests})`, value: "sent_requests" },
    { name: `Blocked Users (${blocked})`, value: "blocked" },
  ];

  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(name, value);
    return params.toString();
  };

  return (
    <>
      <div className="md:hidden">
        <div className="flex w-full flex-row justify-center pb-4">
          <select
            className="w-[65%] rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-0 focus:outline-none dark:border-slate-400 dark:bg-black dark:text-white dark:focus:border-slate-200"
            value={currentTab}
            onChange={(e) => {
              router.push(
                `${pathname}?${createQueryString("tab", e.target.value)}`,
              );
            }}
          >
            {tabs.map((tab) => (
              <option key={`tab-${tab.value}`} value={tab.value}>
                {tab.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="hidden border-b border-gray-200 sm:block">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
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
              {tab.name}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
