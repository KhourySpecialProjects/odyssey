import { cn } from "@/lib/utils";
import {
  IconArchive,
  IconDroplet,
  IconHeart,
  IconLayoutList,
  IconMap,
  IconNews,
  IconSearch,
} from "@tabler/icons-react";
import { Check, Handshake, Info, ThumbsUp, UsersRound } from "lucide-react";
import { FEED_COLORS } from "@/lib/feed-colors";
import {
  SAMPLE_DROPLETS,
  SAMPLE_GROUP,
  SAMPLE_PEOPLE,
} from "../journey-config";
import { AppFrame, DropletTileReplica, type PanelProps } from "./app-frame";

// Replica of /activity (components/feed/*): the left nav, the feed with its
// type filters, and the My Droplets tab.

const NAV = [
  { label: "My Feed", Icon: IconNews },
  { label: "My Droplets", Icon: IconDroplet },
  { label: "My Playlists", Icon: IconLayoutList },
  { label: "My Voyages", Icon: IconMap },
  { label: "My Favorited", Icon: IconHeart },
  { label: "Archived", Icon: IconArchive },
];

const PILLS = [
  ["System", "system"],
  ["Droplet", "droplet"],
  ["Playlist", "playlist"],
  ["Group", "group"],
  ["Friend", "friend"],
  ["Kudos", "kudos"],
] as const;

function FeedCard({
  hook,
  type,
  icon,
  label,
  entity,
  children,
}: {
  hook: string;
  type: keyof typeof FEED_COLORS;
  icon: React.ReactNode;
  label: string;
  entity?: string;
  children: React.ReactNode;
}) {
  const colors = FEED_COLORS[type];
  return (
    <li
      data-j={hook}
      className={cn(
        "relative flex translate-y-2 flex-col gap-2 rounded-[8px] border p-3 opacity-0 transition-[opacity,transform] duration-500 data-[on=1]:translate-y-0 data-[on=1]:opacity-100",
        colors.card,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2 font-semibold",
          colors.accent,
        )}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[13px]">{label}</span>
          {entity && (
            <>
              <span className="text-[13px] opacity-60">·</span>
              <span className="truncate text-[13px] font-medium">{entity}</span>
            </>
          )}
        </div>
        <Check size={15} className="text-slate-400" />
      </div>
      <div className="text-[13px] font-medium text-slate-900 dark:text-slate-200">
        {children}
      </div>
    </li>
  );
}

export function ActivityPanel({ compact }: PanelProps) {
  return (
    <AppFrame
      hook="panel-activity"
      url="khouryodyssey.org/activity"
      active="Activity"
      compact={compact}
    >
      <div className="flex h-full">
        {!compact && (
          <nav className="w-[190px] shrink-0 border-r border-[#D0D5DD] bg-[#FCFCFD] px-2 py-4 dark:border-slate-700 dark:bg-slate-900">
            <ul className="space-y-0.5">
              {NAV.map(({ label, Icon }, i) => (
                <li
                  key={label}
                  data-j={`ac-nav-${i}`}
                  data-on={i === 0 ? "1" : "0"}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-[#344054] transition-colors duration-300 data-[on=1]:bg-[#287697]/10 data-[on=1]:text-[#287697] dark:text-slate-300 dark:data-[on=1]:bg-[#287697]/20 dark:data-[on=1]:text-[#4AABCF]"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div
          className={cn(
            "relative min-w-0 flex-1",
            compact ? "px-4 py-4" : "px-6 py-5",
          )}
        >
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Welcome back, {SAMPLE_PEOPLE.learner}!
          </h1>

          {/* My Feed */}
          <div
            data-j="ac-view-feed"
            className="transition-opacity duration-300 data-[on=0]:opacity-0"
          >
            <p className="mt-0.5 text-[13px] text-slate-600 dark:text-slate-400">
              Check out what&apos;s happening right now.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {PILLS.slice(0, compact ? 4 : 6).map(([label, type]) => (
                <span
                  key={type}
                  className={cn(
                    "rounded-full border-[1.5px] px-2.5 py-0.5 text-[12px] font-medium",
                    // Every type is selected by default (feed-filter-params.ts)
                    FEED_COLORS[type].pillActive,
                  )}
                >
                  {label}
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-4 border-b border-slate-200 text-[13px] font-medium dark:border-slate-700">
              <span className="border-b-2 border-[#2D7597] pb-1.5 text-[#2D7597]">
                Unread
              </span>
              <span className="pb-1.5 text-slate-500">Read</span>
            </div>
            <ul className="mt-3 space-y-2.5">
              <FeedCard
                hook="ac-card-0"
                type="friend"
                icon={<Handshake size={16} />}
                label="Friend"
                entity={SAMPLE_PEOPLE.friend}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>
                    {SAMPLE_PEOPLE.friend} has just finished Git Fundamentals
                  </span>
                  <ThumbsUp
                    data-j="ac-kudos"
                    className="h-5 w-5 shrink-0 fill-none stroke-slate-900 transition-[fill] duration-300 data-[on=1]:fill-slate-900 dark:stroke-slate-200 dark:data-[on=1]:fill-slate-200"
                  />
                </div>
              </FeedCard>
              <FeedCard
                hook="ac-card-1"
                type="group"
                icon={<UsersRound size={16} />}
                label="Group"
                entity={SAMPLE_GROUP.name}
              >
                {SAMPLE_GROUP.name} has been updated
              </FeedCard>
              <FeedCard
                hook="ac-card-2"
                type="system"
                icon={<Info size={16} />}
                label="System"
              >
                Hey there — welcome to Odyssey! This is where you&apos;ll see
                updates to your droplets, playlists, and groups.
              </FeedCard>
            </ul>
          </div>

          {/* My Droplets */}
          <div
            data-j="ac-view-droplets"
            className={cn(
              "absolute inset-x-0 top-14 opacity-0 transition-opacity duration-300 data-[on=1]:opacity-100",
              compact ? "px-4" : "px-6",
            )}
          >
            <p className="text-[13px] text-slate-600 dark:text-slate-400">
              View and manage your enrolled droplets.
            </p>
            <div className="relative mt-3 flex items-center">
              <IconSearch className="absolute left-3 h-4 w-4 text-[#667085]" />
              <span className="flex h-8 w-full max-w-[320px] items-center rounded-[30px] border border-[#D0D5DD] bg-white pl-9 text-[13px] text-[#667085] dark:border-slate-600 dark:bg-slate-900">
                Search...
              </span>
            </div>
            <ul className={cn("mt-3 grid gap-3", !compact && "grid-cols-2")}>
              <DropletTileReplica droplet={SAMPLE_DROPLETS[0]} percent={100} />
              <DropletTileReplica droplet={SAMPLE_DROPLETS[4]} percent={50} />
            </ul>
          </div>
        </div>
      </div>
    </AppFrame>
  );
}
