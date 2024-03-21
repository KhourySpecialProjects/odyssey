"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronDownIcon, CogIcon, LogInIcon, LogOutIcon } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";

const activeLinkClasses =
  "block px-3 py-2 text-white bg-sky-700 rounded md:bg-transparent md:text-sky-700 md:p-0 md:dark:text-sky-500";
const inactiveLinkClasses =
  "block px-3 py-2 text-slate-900 rounded hover:bg-slate-100 md:hover:bg-transparent md:hover:text-sky-700 md:p-0 md:dark:hover:text-sky-500 dark:text-white dark:hover:bg-slate-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-slate-700";

type HeaderLink = {
  href: string;
  text: string;
};

const headerLinks: HeaderLink[] = [
  {
    href: "/",
    text: "Home",
  },
  {
    href: "/explore",
    text: "Explore",
  },
];

export default function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 z-20 w-full bg-white border-b border-slate-200 dark:bg-slate-900 start-0 dark:border-slate-600">
      <div className="grid grid-cols-2 md:grid-cols-[1fr_auto_1fr] items-center justify-between max-w-screen-xl px-4 py-3 mx-auto">
        <Link href="/">
          <Image
            src="/logo.svg"
            alt="Khoury Odyssey Logo"
            width={165}
            height={45}
            priority
          />
        </Link>
        <div className="flex justify-end items-center md:col-start-3">
          {status === "loading" ? (
            <div
              role="status"
              className="w-48 max-w-sm rounded-full animate-pulse h-9 bg-slate-200 dark:bg-slate-700"
            ></div>
          ) : session?.user ? (
            <div className="flex items-center justify-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="w-full group flex shrink cursor-pointer select-none items-center justify-between gap-1 rounded-lg p-1.5 px-2 text-sm text-slate-600 transition-colors duration-100 wg-antialiased hover:bg-slate-100 dark:hover:bg-white/5">
                    <div className="inline-flex flex-row items-center justify-between">
                      {session.user.image ? (
                        <Avatar variant="round" size="xs">
                          <AvatarImage src={session.user.image} />
                          <AvatarFallback>
                            {session.user.name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                      ) : null}

                      <span className="font-medium ms-2">
                        Hi, <b>{session.user.name ?? session.user.email}</b>!
                      </span>
                    </div>

                    <ChevronDownIcon className="w-5 h-5 trigger-icon text-slate-400" />
                  </div>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="mb-3 min-w-[220px]">
                  <DropdownMenuLabel className="text-xs">
                    NUID: {session.employeeId || "unknown"}
                    <br />
                    Title: {session.jobTitle || "unknown"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {session.isAdmin ? (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <CogIcon className="mr-2 w-4 h-4" />
                        <span>Admin</span>
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      signOut();
                    }}
                  >
                    <LogOutIcon className="mr-2 w-4 h-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Button
              size="sm"
              before={<LogInIcon />}
              onClick={() => signIn("azure-ad")}
            >
              Sign in
            </Button>
          )}
        </div>

        <div
          className="items-center justify-between hidden w-full md:flex md:w-auto md:col-start-2 md:row-start-1"
          id="navbar-sticky"
        >
          <ul className="flex flex-col p-4 mt-4 font-medium border rounded-lg border-slate-100 md:p-0 bg-slate-50 md:space-x-8 md:flex-row md:mt-0 md:border-0 md:bg-white dark:bg-slate-800 md:dark:bg-slate-900 dark:border-slate-700">
            {headerLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={
                    pathname == link.href
                      ? activeLinkClasses
                      : inactiveLinkClasses
                  }
                  aria-current={pathname == link.href}
                >
                  {link.text}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
