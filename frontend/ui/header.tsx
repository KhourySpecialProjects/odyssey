"use client";

import { Avatar, DropdownMenu } from "@lemonsqueezy/wedges";
import { ChevronDownIcon, LogOutIcon } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const activeLinkClasses =
    "block px-3 py-2 text-white bg-blue-700 rounded md:bg-transparent md:text-blue-700 md:p-0 md:dark:text-blue-500";
  const inactiveLinkClasses =
    "block px-3 py-2 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700";

  return (
    <>
      <nav className="fixed top-0 z-20 w-full bg-white border-b border-gray-200 dark:bg-gray-900 start-0 dark:border-gray-600">
        <div className="grid grid-cols-2 md:grid-cols-[1fr_auto_1fr] items-center justify-between max-w-screen-xl p-4 mx-auto">
          <Link href="/" className="flex items-center space-x-3">
            <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">
              Droplets
            </span>
          </Link>
          <div className="flex space-x-3 md:col-start-3 md:space-x-0 justify-end">
            {status === "loading" ? (
              <div
                role="status"
                className="max-w-sm animate-pulse h-9 bg-gray-200 rounded-full dark:bg-gray-700 w-48"
              ></div>
            ) : session?.user ? (
              <div className="flex items-center justify-center">
                <DropdownMenu>
                  <DropdownMenu.Trigger asChild>
                    <span className="group flex shrink cursor-pointer select-none items-center justify-center gap-1 rounded-lg p-1.5 px-2 text-sm text-surface-600 transition-colors duration-100 wg-antialiased hover:bg-surface dark:hover:bg-white/5">
                      {session.user.image ? (
                        <Avatar
                          size="xs"
                          src={session.user.image}
                          initials={session.user.name?.charAt(0) || "?"}
                        />
                      ) : null}

                      <span className=" ms-2 flex flex-col">
                        <span className="font-medium">
                          Hi, <b>{session.user.name ?? session.user.email}</b>!
                        </span>
                      </span>

                      <ChevronDownIcon className="trigger-icon h-5 w-5 text-surface-400" />
                    </span>
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Content
                    align="center"
                    className="min-w-[140px]"
                  >
                    <DropdownMenu.Label>
                      NUID: {session.employeeId || "unknown"}
                      <br />
                      Title: {session.jobTitle || "unknown"}
                    </DropdownMenu.Label>

                    <DropdownMenu.Separator />

                    <DropdownMenu.Item
                      onClick={(e) => {
                        e.preventDefault();
                        signOut();
                      }}
                    >
                      <LogOutIcon className="w-4 h-4" />
                      <span>Log Out</span>
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => signIn("azure-ad")}
                className="px-4 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
              >
                Log in
              </button>
            )}
          </div>

          <div
            className="items-center justify-between hidden w-full md:flex md:w-auto md:col-start-2 md:row-start-1"
            id="navbar-sticky"
          >
            <ul className="flex flex-col p-4 mt-4 font-medium border border-gray-100 rounded-lg md:p-0 bg-gray-50 md:space-x-8 md:flex-row md:mt-0 md:border-0 md:bg-white dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700">
              <li>
                <Link
                  href="/"
                  className={
                    pathname == "/" ? activeLinkClasses : inactiveLinkClasses
                  }
                  aria-current={pathname == "/"}
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/public"
                  className={
                    pathname == "/public"
                      ? activeLinkClasses
                      : inactiveLinkClasses
                  }
                  aria-current={pathname == "/public"}
                >
                  Public Page
                </Link>
              </li>
              <li>
                <Link
                  href="/private"
                  className={
                    pathname == "/private"
                      ? activeLinkClasses
                      : inactiveLinkClasses
                  }
                  aria-current={pathname == "/private"}
                >
                  Private
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
}
