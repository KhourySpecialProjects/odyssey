"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Droplet,
  ListMusic,
  UsersRound,
  ShieldCheck,
  PenLine,
  BarChart2,
} from "lucide-react";
import type { LucideProps } from "lucide-react";

// ——— Types ———
export type AdminNavVariant =
  | "Default"
  | "Dashboard"
  | "Users"
  | "Droplets"
  | "Playlists"
  | "Groups"
  | "Access Manager"
  | "Creators Manager"
  | "Reports";

// ——— Per-icon sub-components (Default and active/white variant) ———
function NavIcon({
  Icon,
  active,
}: {
  Icon: React.ComponentType<LucideProps>;
  active: boolean;
}) {
  return (
    <Icon
      className={cn(
        "h-[22px] w-[22px] flex-shrink-0",
        active ? "text-white" : "text-[#344054]",
      )}
      strokeWidth={1.8}
    />
  );
}

export function DashboardIcon({ active }: { active: boolean }) {
  return <NavIcon Icon={LayoutDashboard} active={active} />;
}
export function UsersIcon({ active }: { active: boolean }) {
  return <NavIcon Icon={Users} active={active} />;
}
export function DropletIcon({ active }: { active: boolean }) {
  return <NavIcon Icon={Droplet} active={active} />;
}
export function PlaylistIcon({ active }: { active: boolean }) {
  return <NavIcon Icon={ListMusic} active={active} />;
}
export function GroupsIcon({ active }: { active: boolean }) {
  return <NavIcon Icon={UsersRound} active={active} />;
}
export function AccessManagerIcon({ active }: { active: boolean }) {
  return <NavIcon Icon={ShieldCheck} active={active} />;
}
export function CreatorsManagerIcon({ active }: { active: boolean }) {
  return <NavIcon Icon={PenLine} active={active} />;
}
export function ReportsIcon({ active }: { active: boolean }) {
  return <NavIcon Icon={BarChart2} active={active} />;
}

// ——— Nav item definitions ———
const NAV_ITEMS: {
  label: string;
  variant: Exclude<AdminNavVariant, "Default">;
  href: string;
  Icon: React.ComponentType<{ active: boolean }>;
}[] = [
  {
    label: "Dashboard",
    variant: "Dashboard",
    href: "/admin",
    Icon: DashboardIcon,
  },
  { label: "Users", variant: "Users", href: "/admin/users", Icon: UsersIcon },
  {
    label: "Droplets",
    variant: "Droplets",
    href: "/admin/droplets",
    Icon: DropletIcon,
  },
  {
    label: "Playlists",
    variant: "Playlists",
    href: "/admin/playlists",
    Icon: PlaylistIcon,
  },
  {
    label: "Groups",
    variant: "Groups",
    href: "/admin/groups",
    Icon: GroupsIcon,
  },
  {
    label: "Access Manager",
    variant: "Access Manager",
    href: "/admin/access-manager",
    Icon: AccessManagerIcon,
  },
  {
    label: "Creators Manager",
    variant: "Creators Manager",
    href: "/admin/creators-manager",
    Icon: CreatorsManagerIcon,
  },
  {
    label: "Reports",
    variant: "Reports",
    href: "/admin/reports",
    Icon: ReportsIcon,
  },
];

// ——— Main component ———
interface AdminNavProps {
  /**
   * Explicitly set the active item. Useful for overrides or testing.
   * When omitted the active item is derived automatically from the current pathname.
   */
  property1?: AdminNavVariant;
}

export function AdminNav({ property1 }: AdminNavProps) {
  const pathname = usePathname();

  const activeVariant: AdminNavVariant = (() => {
    // Explicit prop wins (unless "Default")
    if (property1 && property1 !== "Default") return property1;
    // Exact match for dashboard root
    if (pathname === "/admin") return "Dashboard";
    // Prefix match for sub-pages (longest match first)
    const match = [...NAV_ITEMS]
      .reverse()
      .find((item) => item.href !== "/admin" && pathname.startsWith(item.href));
    return match?.variant ?? "Default";
  })();

  return (
    <nav
      aria-label="Admin navigation"
      className="sticky top-0 flex h-screen w-[281px] flex-shrink-0 flex-col bg-[#FCFCFD] shadow-[0px_4px_4px_rgba(0,0,0,0.25)]"
    >
      {/* Nav items */}
      <ul className="mt-2 flex flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = activeVariant === item.variant;
          return (
            <li key={item.variant}>
              <Link
                href={item.href}
                className={cn(
                  "relative flex h-12 w-full items-center rounded-xl transition-colors",
                  isActive ? "bg-[#2D7597]" : "hover:bg-slate-100",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Icon — ~15% indent */}
                <span className="ml-[15%]">
                  <item.Icon active={isActive} />
                </span>

                {/* Label — ~27.4% indent, Lato Regular 20px */}
                <span
                  className={cn(
                    "absolute left-[27.4%] text-[18px] leading-none font-normal",
                    isActive ? "text-white" : "text-black",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
