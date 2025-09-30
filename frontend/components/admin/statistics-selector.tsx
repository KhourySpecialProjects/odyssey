"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Render a tab-like selector controlled by the URL query parameter `statsTab` and display the matching content.
 *
 * The active tab is determined from the current URL's `statsTab` parameter (defaults to "General Statistics").
 * Clicking a tab updates the `statsTab` query parameter and navigates to the updated URL.
 *
 * @param content - A record mapping tab labels (displayed as tab buttons) to the corresponding React node shown when that tab is selected.
 * @returns The JSX element containing the tab bar and the content for the currently selected tab.
 */
export function StatisticsSelector({
  content,
}: {
  content: Record<string, React.ReactNode>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("statsTab") || "General Statistics";

  const createQueryString = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("statsTab", value);
    return params.toString();
  };

  return (
    <div>
      <div className="align-center flex justify-center pb-4 select-none">
        <div className="flex w-max flex-row flex-nowrap space-x-2 rounded-lg px-2 py-2 shadow">
          {Object.keys(content).map((key) => (
            <div
              key={key}
              className={
                "cursor-pointer rounded-lg px-2 py-1 " +
                (currentTab === key
                  ? "bg-slate-200 dark:text-black"
                  : "hover:bg-slate-100 dark:hover:text-black")
              }
              onClick={() => {
                router.push(`${pathname}?${createQueryString(key)}`);
              }}
            >
              {key}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">{content[currentTab]}</div>
    </div>
  );
}
