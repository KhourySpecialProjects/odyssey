import { authOptions } from "@/lib/auth/options";
import { ArrowRightIcon } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { Button } from "./ui/button";

export default async function AccessRequestBanner() {
  const session = await getServerSession(authOptions);
  if (session) return null;

  return (
    <>
      <div className="relative isolate flex items-center gap-x-6 overflow-hidden bg-white dark:bg-slate-900 px-6 py-2.5 sm:px-3.5 sm:before:flex-1 border-b dark:border-slate-500">
        {/* <div
          className="absolute left-[max(-7rem,calc(50%-52rem))] top-1/2 -z-10 -translate-y-1/2 transform-gpu blur-2xl"
          aria-hidden="true"
        >
          <div
            className="aspect-[577/310] w-[36.0625rem] bg-gradient-to-r from-[#98D1B5] to-[#A0E0EF] opacity-30"
            style={{
              clipPath:
                "polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)",
            }}
          ></div>
        </div>
        <div
          className="absolute left-[max(45rem,calc(50%+8rem))] top-1/2 -z-10 -translate-y-1/2 transform-gpu blur-2xl"
          aria-hidden="true"
        >
          <div
            className="aspect-[577/310] w-[36.0625rem] bg-gradient-to-l from-[#98D1B5] to-[#A0E0EF] opacity-30"
            style={{
              clipPath:
                "polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)",
            }}
          ></div>
        </div> */}

        <div className="flex flex-wrap items-center justify-center flex-grow w-full gap-x-4 gap-y-2">
          <p className="text-sm leading-6 text-slate-900 dark:text-slate-300" data-testid="access-banner-title">
            <strong className="font-semibold" >
              Ready to join the Odyssey?
            </strong>
          </p>
          <Button
            size="xs"
            className="dark:bg-slate-300"
            after={<ArrowRightIcon />}
            asChild
          >
            <Link role="link" aria-label="request access" href="/request-access">Request Access</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
