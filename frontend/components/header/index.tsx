import { getCurrentUser } from "@/lib/auth/session";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getGeneralConfig } from "@/config/general";
import { Menu } from "lucide-react";
import { LoginButton } from "./login-button";
import { NavLinks } from "./nav-links";
import { UserDropdown } from "./user-dropdown";
import { AuthorizedUser } from "@/types";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { DarkMode } from "../explore/dark-mode";

export async function Header() {
  const user = await getCurrentUser();

  const getNavLinks = () => {
    return generalConfig.mainNav;
  };
  const generalConfig = getGeneralConfig(user);
  let authorizedUser: AuthorizedUser | null = null;
  if (user?.email) {
    authorizedUser = (await getAuthorizedUserByEmail(
      user.email,
    )) as AuthorizedUser;
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 dark:border-slate-500 dark:bg-slate-900 md:px-6">
      <div className="flex items-center justify-between h-full max-w-screen-xl px-4 py-3 mx-auto">
        <div className="flex flex-row justify-between md:grid w-full md:grid-cols-[1fr_auto_1fr]">
          <div className="flex flex-row gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 md:hidden"
                >
                  <Menu className="w-5 h-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <nav className="grid gap-6">
                  <Link href="/">
                    <Image
                      src="/logo.svg"
                      alt="Khoury Odyssey Logo"
                      width={165}
                      height={45}
                      priority
                    />
                    <span className="sr-only">
                      Odyssey, a Khoury College Learning Platform
                    </span>
                  </Link>
                  <NavLinks
                    items={getNavLinks()}
                    className="flex-col space-y-2"
                  />
                  <div className="ml-2">
                    <DarkMode />
                  </div>
                </nav>
              </SheetContent>
            </Sheet>

            <Link href="/" className="w-max">
              <Image
                src="/logo.svg"
                alt="Khoury Odyssey Logo"
                width={165}
                height={45}
                priority
              />
              <span className="sr-only">
                Odyssey, a Khoury College Learning Platform
              </span>
            </Link>
          </div>

          <nav className="flex-row items-center hidden md:flex">
            <NavLinks
              items={getNavLinks()}
              className="flex-row space-x-8 space-y-0"
            />
          </nav>

          <div className="flex items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
            <div className="hidden lg:block ml-4">
              <DarkMode />
            </div>
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
