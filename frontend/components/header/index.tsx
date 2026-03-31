"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getGeneralConfig } from "@/config/general";
import { Menu } from "lucide-react";
import { LoginButton } from "./login-button";
import { NavLinks } from "./nav-links";
import { UserDropdown } from "./user-dropdown";
import { AuthorizedUser, User } from "@/types";
import { DarkMode } from "../explore/dark-mode";
import { Logo } from "./logo";
import { NAV_ITEMS as ADMIN_NAV_ITEMS } from "@/components/admin/admin-nav";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function Header({
  user,
  authorizedUser,
}: {
  user: User | undefined;
  authorizedUser: AuthorizedUser | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  const getNavLinks = () => {
    return generalConfig.mainNav;
  };
  const generalConfig = getGeneralConfig(user);

  const handleCloseSheet = () => {
    setIsOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white xl:px-6 dark:border-slate-500 dark:bg-slate-900">
      <div className="mx-auto flex h-full max-w-screen-xl items-center justify-between px-4 py-3">
        <div className="flex w-full flex-row justify-between xl:grid xl:grid-cols-[1fr_auto_1fr]">
          <div className="flex flex-row gap-4">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild role="banner">
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 xl:hidden"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="flex flex-col overflow-y-auto"
              >
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <nav className="grid gap-4">
                  <Link href="/">
                    <Logo width={165} height={45} />
                    <span className="sr-only">
                      Odyssey, a Khoury College Learning Platform
                    </span>
                  </Link>
                  <NavLinks
                    items={getNavLinks()}
                    className="flex-col space-y-2 text-2xl"
                    onLinkClick={handleCloseSheet}
                  />

                  {isAdminRoute && (
                    <>
                      <div className="h-px bg-slate-200 dark:bg-slate-700" />
                      <ul className="flex flex-col space-y-1 text-lg">
                        {ADMIN_NAV_ITEMS.map((item) => {
                          const isActive =
                            pathname === item.href ||
                            (item.href !== "/admin" &&
                              pathname.startsWith(item.href));
                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                onClick={handleCloseSheet}
                                className={cn(
                                  "block rounded px-3 py-1.5",
                                  isActive
                                    ? "bg-sky-700 font-bold text-white"
                                    : "text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-slate-700",
                                )}
                              >
                                {item.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                </nav>
                <div className="mt-auto pt-4 sm:hidden">
                  <DarkMode />
                </div>
              </SheetContent>
            </Sheet>
            <Link href="/" className="hidden w-max sm:block">
              <Logo width={165} height={45} />
              <span className="sr-only">
                Odyssey, a Khoury College Learning Platform
              </span>
            </Link>
          </div>

          <Link href="/" className="w-max sm:hidden">
            <Logo width={165} height={45} />
            <span className="sr-only">
              Odyssey, a Khoury College Learning Platform
            </span>
          </Link>

          <nav className="hidden flex-row items-center xl:flex">
            <NavLinks
              items={getNavLinks()}
              className="flex-row space-y-0 space-x-8"
            />
          </nav>

          <div className="flex items-center gap-4 md:ml-auto md:gap-2 xl:gap-2">
            {user ? (
              <div className="flex items-center justify-center">
                <UserDropdown user={user} authorizedUser={authorizedUser} />
              </div>
            ) : (
              <LoginButton />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
