"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

// A component that displays a tab selector for different admin views.
// It takes a `content` prop, which is an object where keys are tab names and values are React nodes to display for each tab.
// The selected tab is determined by the `adminTab` query parameter in the URL.
// When a tab is clicked, it updates the URL with the corresponding `adminTab` value.
export function AdminSelector({
  content,
}: {
  content: Record<string, React.ReactNode>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("adminTab") || Object.keys(content)[0];

  // Function to create a new query string with the updated adminTab parameter
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
