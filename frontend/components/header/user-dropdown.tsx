"use client";
import { getInitials, condenseRoleTitles } from "@/lib/utils";
import { AuthorizedUser, User } from "@/types";
import { ChevronDownIcon, LogOutIcon, User2Icon, Settings } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export function UserDropdown({
  user,
  authorizedUser,
}: {
  user: User;
  authorizedUser: AuthorizedUser | null;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        {/* A real button so it's in the tab order and can carry the menu's
            aria-haspopup/aria-expanded; the greeting is hidden below sm, so
            the name comes from aria-label */}
        <button
          type="button"
          aria-label="Account menu"
          className="light:text-slate-600 group flex w-full shrink cursor-pointer items-center justify-between gap-1 rounded-lg p-1.5 px-1 text-sm antialiased transition-colors duration-100 select-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:outline-none dark:hover:bg-white/5 dark:focus-visible:ring-slate-300"
        >
          <div className="inline-flex flex-row items-center justify-between">
            <Avatar variant="round" size="xs">
              <AvatarImage
                src={authorizedUser?.profilePhoto || user?.image || undefined}
              />
              <AvatarFallback>
                {user.name ? (
                  getInitials(user.name)
                ) : (
                  <User2Icon className="h-4 w-4" />
                )}
              </AvatarFallback>
            </Avatar>
            <span className="ms-2 hidden font-medium sm:block">
              Hi, <b>{authorizedUser?.firstName ?? user.name ?? user.email}</b>!
            </span>
          </div>
          <ChevronDownIcon className="trigger-icon h-5 w-5 text-slate-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="mb-3 min-w-[220px]">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm leading-none font-semibold">
              {user.name} {user.nuid ? ` (${user.nuid})` : ""}
            </p>
            <p className="text-muted-foreground text-xs leading-none">
              {user.email}
            </p>
            <p className="text-muted-foreground max-w-40 text-xs leading-none">
              Role(s): {condenseRoleTitles(user.roles)}
            </p>
            <p className="text-muted-foreground mt-1 text-xs leading-none">
              v{process.env.NEXT_PUBLIC_APP_VERSION ?? "dev"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild data-testid="profile-link">
          <Link
            href={`/prof/${user.email?.replace("@northeastern.edu", "") || ""}`}
          >
            <User2Icon className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild data-testid="settings-link">
          <Link href="/settings">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          role="menuitem"
          onSelect={(e) => {
            e.preventDefault();
            signOut({
              callbackUrl: "/",
              redirect: true,
            });
          }}
        >
          <LogOutIcon className="mr-2 h-4 w-4" />
          <span>Log Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
