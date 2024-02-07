"use client";

import { Avatar, DropdownMenu } from "@lemonsqueezy/wedges";
import { ChevronDownIcon, LogOutIcon } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const activeLinkClasses =
  "block px-3 py-2 text-white bg-blue-700 rounded md:bg-transparent md:text-blue-700 md:p-0 md:dark:text-blue-500";
const inactiveLinkClasses =
  "block px-3 py-2 text-slate-900 rounded hover:bg-slate-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-slate-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-slate-700";

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
    href: "/public",
    text: "Public",
  },
  {
    href: "/d/demo-droplet",
    text: "Demo Droplet",
  },
  {
    href: "/admin",
    text: "Admin",
  },
];

export default function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  return (
    <>
      <nav className="fixed top-0 z-20 w-full bg-white border-b border-slate-200 dark:bg-slate-900 start-0 dark:border-slate-600">
        <div className="grid grid-cols-2 md:grid-cols-[1fr_auto_1fr] items-center justify-between max-w-screen-xl p-4 mx-auto">
          <Link href="/" className="flex items-center space-x-3">
            <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">
              Khoury Odyssey
            </span>
          </Link>
          <div className="flex justify-end space-x-3 md:col-start-3 md:space-x-0">
            {status === "loading" ? (
              <div
                role="status"
                className="w-48 max-w-sm rounded-full animate-pulse h-9 bg-slate-200 dark:bg-slate-700"
              ></div>
            ) : session?.user ? (
              <div className="flex items-center justify-center">
                <DropdownMenu>
                  <DropdownMenu.Trigger asChild>
                    <div className="group flex shrink cursor-pointer select-none items-center justify-center gap-1 rounded-lg p-1.5 px-2 text-sm text-slate-600 transition-colors duration-100 wg-antialiased hover:bg-slate-100 dark:hover:bg-white/5">
                      {session.user.image ? (
                        <Avatar
                          size="xs"
                          src={session.user.image}
                          initials={session.user.name?.charAt(0) || "?"}
                        />
                      ) : null}

                      <span className="font-medium ms-2">
                        Hi, <b>{session.user.name ?? session.user.email}</b>!
                      </span>

                      <ChevronDownIcon className="w-5 h-5 trigger-icon text-slate-400" />
                    </div>
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
    </>
  );
}
