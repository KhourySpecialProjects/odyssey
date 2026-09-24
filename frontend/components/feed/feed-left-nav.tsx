"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconArchive,
  IconDroplet,
  IconHeart,
  IconLayoutList,
  IconMap,
  IconNews,
  IconUsers,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { SectionTabs } from "@/components/ui/section-tabs";

const TABS = [
  { href: "/activity", label: "My Feed", Icon: IconNews },
  { href: "/activity/droplets", label: "My Droplets", Icon: IconDroplet },
  { href: "/activity/playlists", label: "My Playlists", Icon: IconLayoutList },
  { href: "/activity/voyages", label: "My Voyages", Icon: IconMap },
  { href: "/activity/favorited", label: "My Favorited", Icon: IconHeart },
  { href: "/activity/archived", label: "Archived", Icon: IconArchive },
];

// The friends column (pending requests, friends list) only shows at xl, so
// narrower layouts link to the Friends settings page instead
function getFriendsLink(pendingRequestCount: number) {
  return {
    href:
      pendingRequestCount > 0
        ? "/settings/friends?tab=recieved_requests"
        : "/settings/friends",
    label: "Friends",
    badge: {
      count: pendingRequestCount,
      label: pendingRequestCount === 1 ? "pending request" : "pending requests",
    },
  };
}

export function FeedLeftNav({
  pendingRequestCount = 0,
}: {
  pendingRequestCount?: number;
}) {
  const pathname = usePathname();
  const friends = getFriendsLink(pendingRequestCount);

  return (
    <div className="flex h-full flex-col overflow-hidden py-6">
      <nav aria-label="Content sections" className="flex-1">
        <ul className="space-y-0.5 px-3">
          {TABS.map(({ href, label, Icon }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[#287697]/10 text-[#287697] dark:bg-[#287697]/20 dark:text-[#4AABCF]"
                      : "text-[#344054] hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive
                        ? "text-[#287697] dark:text-[#4AABCF]"
                        : "text-[#667085] dark:text-slate-400",
                    )}
                    stroke={1.75}
                  />
                  {label}
                </Link>
              </li>
            );
          })}
          <li className="xl:hidden">
            <Link
              href={friends.href}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#344054] transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <IconUsers
                className="h-4 w-4 shrink-0 text-[#667085] dark:text-slate-400"
                stroke={1.75}
              />
              {friends.label}
              {friends.badge.count > 0 && (
                <>
                  {" "}
                  <span className="ml-auto rounded-full bg-[#287697] px-1.5 text-xs leading-5 text-white">
                    {friends.badge.count}
                    <span className="sr-only"> {friends.badge.label}</span>
                  </span>
                </>
              )}
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}

// Below lg the side nav is hidden; these tabs sit under the greeting instead
export function FeedSectionTabs({
  pendingRequestCount,
  className,
}: {
  pendingRequestCount: number;
  className?: string;
}) {
  return (
    <SectionTabs
      label="Activity sections"
      className={className}
      items={[
        ...TABS.map(({ href, label }) => ({ href, label })),
        getFriendsLink(pendingRequestCount),
      ]}
    />
  );
}
