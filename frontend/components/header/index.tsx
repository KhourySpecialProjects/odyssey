"use client";

import Link from "next/link";

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
import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Header({
  user,
  authorizedUser,
}: {
  user: User | undefined;
  authorizedUser: AuthorizedUser | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const isDraft = pathname?.startsWith("/draft/");

  const getNavLinks = () => {
    return generalConfig.mainNav;
  };
  const generalConfig = getGeneralConfig(user);

  const handleCloseSheet = () => {
    setIsOpen(false);
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-slate-200 bg-white dark:border-slate-500 dark:bg-slate-900",
        !isDraft && "xl:px-6",
      )}
    >
      <div
        className={cn(
          "flex h-full items-center justify-between py-3",
          isDraft ? "px-4 xl:px-0" : "mx-auto max-w-screen-xl px-4",
        )}
      >
        <div className="flex w-full flex-row justify-between xl:grid xl:grid-cols-[1fr_auto_1fr]">
          <div
            className={cn(
              "flex flex-row gap-4",
              isDraft && "xl:w-64 xl:justify-center",
            )}
          >
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
              <SheetContent side="left">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <nav className="grid gap-6">
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

                  <DarkMode className="sm:hidden" />
                </nav>
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

          <div
            className={cn(
              "flex items-center gap-4 md:ml-auto md:gap-2 xl:gap-2",
              isDraft &&
                "xl:ml-0 xl:w-64 xl:justify-center xl:justify-self-end",
            )}
          >
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
