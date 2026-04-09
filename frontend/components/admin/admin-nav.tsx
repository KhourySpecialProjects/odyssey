"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  IconLayoutGrid,
  IconUser,
  IconDroplet,
  IconLayoutList,
  IconUsers,
  IconUserPlus,
  IconMessageReport,
  IconMap,
  type IconProps,
} from "@tabler/icons-react";

// ——— Types ———
export type AdminNavVariant =
  | "Default"
  | "Dashboard"
  | "Users"
  | "Droplets"
  | "Playlists"
  | "Groups"
  | "Requests"
  | "Access Manager"
  | "Creators Manager"
  | "Reports"
  | "Voyages";

// ——— Per-icon sub-components ———
function NavIcon({
  Icon,
  active,
}: {
  Icon: React.ComponentType<IconProps>;
  active: boolean;
}) {
  return (
    <Icon
      className={cn(
        "h-4 w-4 flex-shrink-0",
        active ? "text-white" : "text-[#344054] dark:text-slate-400",
      )}
      stroke={1.8}
    />
  );
}

export function DashboardIcon({ active }: { active: boolean }) {
  return <NavIcon Icon={IconLayoutGrid} active={active} />;
}
export function UsersIcon({ active }: { active: boolean }) {
  return <NavIcon Icon={IconUser} active={active} />;
}
export function DropletIcon({ active }: { active: boolean }) {
  return <NavIcon Icon={IconDroplet} active={active} />;
}
export function PlaylistIcon({ active }: { active: boolean }) {
  return <NavIcon Icon={IconLayoutList} active={active} />;
}
export function GroupsIcon({ active }: { active: boolean }) {
  return <NavIcon Icon={IconUsers} active={active} />;
}
export function RequestsIcon({ active }: { active: boolean }) {
  return <NavIcon Icon={IconUserPlus} active={active} />;
}
export function RolesIcon({ active }: { active: boolean }) {
  return <NavIcon Icon={IconUserPlus} active={active} />;
}
export function AccessManagerIcon({ active }: { active: boolean }) {
  return <NavIcon Icon={IconUserPlus} active={active} />;
}
export function CreatorsManagerIcon({ active }: { active: boolean }) {
  return <NavIcon Icon={IconUsers} active={active} />;
}
export function ReportsIcon({ active }: { active: boolean }) {
  return <NavIcon Icon={IconMessageReport} active={active} />;
}
export function VoyagesIcon({ active }: { active: boolean }) {
  return <NavIcon Icon={IconMap} active={active} />;
}

// ——— Nav item definitions ———
export const NAV_ITEMS: {
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
    label: "Voyages",
    variant: "Voyages",
    href: "/admin/voyages",
    Icon: VoyagesIcon,
  },
  {
    label: "Groups",
    variant: "Groups",
    href: "/admin/groups",
    Icon: GroupsIcon,
  },
  {
    label: "Requests",
    variant: "Requests",
    href: "/admin/requests",
    Icon: RequestsIcon,
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
  const [headerHeight, setHeaderHeight] = useState(69);
  const navRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const update = () => {
      const header = document.querySelector<HTMLElement>(".sticky.top-0.z-50");
      if (header) setHeaderHeight(header.getBoundingClientRect().height);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const updateBottom = () => {
      if (!navRef.current) return;
      const footer = document.querySelector<HTMLElement>("footer");
      if (!footer) return;
      const footerTop = footer.getBoundingClientRect().top;
      const bottom = Math.max(0, window.innerHeight - footerTop);
      navRef.current.style.bottom = `${bottom}px`;
    };
    updateBottom();
    window.addEventListener("scroll", updateBottom, { passive: true });
    window.addEventListener("resize", updateBottom);
    return () => {
      window.removeEventListener("scroll", updateBottom);
      window.removeEventListener("resize", updateBottom);
    };
  }, []);

  const activeVariant: AdminNavVariant = (() => {
    if (property1 && property1 !== "Default") return property1;
    if (pathname === "/admin") return "Dashboard";
    const match = [...NAV_ITEMS]
      .reverse()
      .find((item) => item.href !== "/admin" && pathname.startsWith(item.href));
    return match?.variant ?? "Default";
  })();

  return (
    <nav
      ref={navRef}
      aria-label="Admin navigation"
      className="fixed left-0 z-40 hidden w-64 flex-shrink-0 flex-col border-r border-[#D0D5DD] bg-[#FCFCFD] md:flex dark:border-slate-700 dark:bg-slate-900"
      style={{ top: headerHeight, bottom: 0 }}
    >
      <ul className="mt-6 flex flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = activeVariant === item.variant;
          return (
            <li key={item.variant}>
              <Link
                href={item.href}
                className={cn(
                  "relative flex h-[44px] w-full items-center rounded-[78px] transition-colors",
                  isActive
                    ? "bg-[#2D7597]"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="ml-[15%]">
                  <item.Icon active={isActive} />
                </span>
                <span
                  className={cn(
                    "absolute left-[27.4%] text-base leading-none font-normal",
                    isActive ? "text-white" : "text-black dark:text-white",
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
