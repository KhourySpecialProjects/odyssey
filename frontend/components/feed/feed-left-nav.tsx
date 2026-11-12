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
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useFeedUnreadStore } from "@/stores/feed-unread-store";
import { useStreakUnread } from "@/components/streaks/streak-feed-card";
import { UnreadBadge } from "./unread-badge";

const TABS = [
  { href: "/activity", label: "My Feed", Icon: IconNews },
  { href: "/activity/droplets", label: "My Droplets", Icon: IconDroplet },
  { href: "/activity/playlists", label: "My Playlists", Icon: IconLayoutList },
  { href: "/activity/voyages", label: "My Voyages", Icon: IconMap },
  { href: "/activity/favorited", label: "My Favorited", Icon: IconHeart },
  { href: "/activity/archived", label: "Archived", Icon: IconArchive },
];

export function FeedLeftNav({
  userId,
  unreadCount,
}: {
  userId: number;
  /** The layout's count, shown until the store has one */
  unreadCount: number;
}) {
  const pathname = usePathname();
  const announcements = useFeedUnreadStore(
    (s) => s.feedCount ?? s.serverCount ?? unreadCount,
  );
  const streakUnread = useStreakUnread(userId);
  const feedUnread = announcements + (streakUnread ? 1 : 0);

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
                  <span className="flex-1">{label}</span>
                  {href === "/activity" && <UnreadBadge count={feedUnread} />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
