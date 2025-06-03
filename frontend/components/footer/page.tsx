import Link from "next/link";
import { ReportBugButton } from "../debug/reportBugButton";
import { getCurrentUser } from "@/lib/auth/session";

export default async function Footer() {
  const user = await getCurrentUser();
  return (
    <footer className="z-60 flex h-20 w-full items-center border-t border-t-[#919191] px-4 gap-2">
      <div className="flex-1"></div>
      
      <div className="flex items-center justify-center gap-x-4 md:gap-x-10">
        <Link className="text-sm md:text-xl font-semibold" href="/about">
          About Odyssey
        </Link>
        <Link className="text-sm md:text-xl font-semibold" href="/website-creators">
          Website Creators
        </Link>
        <Link className="text-sm md:text-xl font-semibold" href="/content-creators">
          Content Creators
        </Link>
        <Link className="text-sm md:text-xl font-semibold" href="/faq">
          FAQ
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-end">
        <ReportBugButton user={user} />
      </div>
      
    </footer>
    
  );
}
