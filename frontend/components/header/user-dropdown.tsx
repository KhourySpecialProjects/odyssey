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
        <div className="group light:text-slate-600 wg-antialiased flex w-full shrink cursor-pointer items-center justify-between gap-1 rounded-lg p-1.5 px-1 text-sm transition-colors duration-100 select-none hover:bg-slate-100 dark:hover:bg-white/5">
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
        </div>
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
