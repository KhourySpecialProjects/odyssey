import { generalConfig } from "@/config/general";
import { getCurrentUser } from "@/lib/auth/session";
import { LogInIcon } from "lucide-react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "../ui/button";
import { NavLinks } from "./nav-links";
import { UserDropdown } from "./user-dropdown";

export async function Header() {
  const user = await getCurrentUser();

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
          {user ? (
            <div className="flex items-center justify-center">
              <UserDropdown {...user} />
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
          <NavLinks items={generalConfig.mainNav} />
        </div>
      </div>
    </nav>
  );
}
