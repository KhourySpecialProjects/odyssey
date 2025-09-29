"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
