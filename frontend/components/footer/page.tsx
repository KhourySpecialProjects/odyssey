import Link from "next/link";
import { ReportBugButton } from "../debug/reportBugButton";
import { getCurrentUser } from "@/lib/auth/session";

export default async function Footer() {
  const user = await getCurrentUser();
  return (
    <footer className="z-60 flex h-20 w-full items-center justify-between border-t border-t-[#919191] px-4">
      <div className="flex flex-1 items-center justify-center gap-x-4 md:gap-x-10">
        <Link className="text-xl font-semibold" href="/about">
          About Odyssey
        </Link>
        <Link className="text-xl font-semibold" href="/website-creators">
          Website Creators
        </Link>
        <Link className="text-xl font-semibold" href="/content-creators">
          Content Creators
        </Link>
        <Link className="text-xl font-semibold" href="/faq">
          FAQ
        </Link>
      </div>
      <div className="flex items-center pl-4 md:pl-0">
        <ReportBugButton user={user} />
      </div>
    </footer>
  );
}
