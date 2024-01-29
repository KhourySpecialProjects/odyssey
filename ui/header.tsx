"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const activeLinkClasses =
    "block px-3 py-2 text-white bg-blue-700 rounded md:bg-transparent md:text-blue-700 md:p-0 md:dark:text-blue-500";
  const inactiveLinkClasses =
    "block px-3 py-2 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700";

  return (
    <>
      <nav className="fixed top-0 z-20 w-full bg-white border-b border-gray-200 dark:bg-gray-900 start-0 dark:border-gray-600">
        <div className="flex flex-wrap items-center justify-between max-w-screen-xl p-4 mx-auto">
          <Link href="/" className="flex items-center space-x-3">
            <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">
              Droplets
            </span>
          </Link>
          <div className="flex space-x-3 md:order-2 md:space-x-0">
            {!session ? (
              <button
                type="button"
                onClick={() => signIn("azure-ad")}
                className="px-4 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
              >
                Log in
              </button>
            ) : null}

            {session?.user ? (
              <div className="inline-flex flex-row items-center gap-4">
                <div className="inline-flex flex-row items-center">
                  Hello,{" "}
                  {session.user.image && (
                    <Image
                      className="block w-6 h-6 mx-1 rounded-full"
                      src={session.user.image}
                      alt="profile photo"
                      width={48}
                      height={48}
                    />
                  )}
                  <strong>
                    {session.user.name ?? session.user.email} (
                    {session.employeeId || "no NUID"})
                  </strong>
                  !
                </div>
                <Link
                  href="/api/auth/signout"
                  onClick={(e) => {
                    e.preventDefault();
                    signOut();
                  }}
                  className="px-4 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
                >
                  Log out
                </Link>
              </div>
            ) : null}
          </div>
          <div
            className="items-center justify-between hidden w-full md:flex md:w-auto md:order-1"
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
