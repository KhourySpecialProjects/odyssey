"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Renders a tabbed selector whose active tab is driven by the `adminTab` URL query parameter.
 *
 * The component displays a horizontal list of tabs derived from `content` keys and shows the
 * corresponding React node for the active tab. Clicking a tab updates the `adminTab` query
 * parameter and navigates to the same pathname with the updated query string.
 *
 * @param content - A mapping from tab label (displayed as the tab) to the content node shown when that tab is active. The first key is used as the default active tab when `adminTab` is not present.
 * @returns A React element containing the tab bar and the currently selected content.
 */
export function AdminSelector({
  content,
}: {
  content: Record<string, React.ReactNode>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("adminTab") || Object.keys(content)[0];

  const createQueryString = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("adminTab", value);
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
