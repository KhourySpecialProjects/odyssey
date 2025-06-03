import Link from "next/link";
import { ReportBugButton } from "../debug/reportBugButton";
import { getCurrentUser } from "@/lib/auth/session";

export default async function Footer() {
  const user = await getCurrentUser();
  return (
    <footer className="z-60 flex h-20 w-full items-center gap-2 border-t border-t-[#919191] px-4">
      <div className="flex-1"></div>

      <div className="flex items-center justify-center gap-x-4 md:gap-x-10">
        <Link className="text-sm font-semibold md:text-xl" href="/about">
          About Odyssey
        </Link>
        <Link
          className="text-sm font-semibold md:text-xl"
          href="/website-creators"
        >
          Website Creators
        </Link>
        <Link
          className="text-sm font-semibold md:text-xl"
          href="/content-creators"
        >
          Content Creators
        </Link>
        <Link className="text-sm font-semibold md:text-xl" href="/faq">
          FAQ
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-end">
        <ReportBugButton user={user} />
      </div>
    </footer>
  );
}
