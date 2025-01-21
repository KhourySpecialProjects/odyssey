"use client";

import {
  getInitials,
  isAuthorizedUserAdmin,
  isAuthorizedUserFaculty,
  condenseRoleTitles,
} from "@/lib/utils";
import { User } from "@/types";
import {
  ChevronDownIcon,
  CogIcon,
  LogOutIcon,
  PersonStanding,
  TowerControlIcon,
  User2Icon,
} from "lucide-react";
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

export function UserDropdown(user: User) {
  const isAdmin = isAuthorizedUserAdmin(user.roles);
  const isFaculty = isAuthorizedUserFaculty(user.roles);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="w-full group flex shrink cursor-pointer select-none items-center justify-between gap-1 rounded-lg p-1.5 px-2 text-sm text-slate-600 transition-colors duration-100 wg-antialiased hover:bg-slate-100 dark:hover:bg-white/5">
          <div className="inline-flex flex-row items-center justify-between">
            <Avatar variant="round" size="xs">
              <AvatarImage src={user.image ?? undefined} />
              <AvatarFallback>
                {user.name ? (
                  getInitials(user.name)
                ) : (
                  <User2Icon className="w-4 h-4" />
                )}
              </AvatarFallback>
            </Avatar>

            <span className="font-medium ms-2">
              Hi, <b>{user.name ?? user.email}</b>!
            </span>
          </div>

          <ChevronDownIcon className="w-5 h-5 trigger-icon text-slate-400" />
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="mb-3 min-w-[220px]">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold leading-none">
              {user.name} {user.nuid ? ` (${user.nuid})` : ""}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            <p className="text-xs leading-none text-muted-foreground max-w-40">
              Role(s): {condenseRoleTitles(user.roles)}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/settings">
            <PersonStanding className="w-4 h-4 mr-2" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            signOut();
          }}
        >
          <LogOutIcon className="w-4 h-4 mr-2" />
          <span>Log Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
