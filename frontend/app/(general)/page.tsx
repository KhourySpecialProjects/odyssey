import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { GradientBackground } from "@/components/gradient-bg";
import { FunFact } from "@/components/droplets/fun-fact";
import { getRandomFunFactDroplet } from "@/lib/requests/droplet";
import { AnimatedSailboat } from "@/components/ui/animated-sailboat";

const outlineLinkCls =
  "inline-flex items-center gap-2 rounded-[8px] border border-[#d0d5dd] bg-white px-[14px] py-[10px] text-sm font-medium text-[#344054] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700";

export default async function HomeRoute() {
  const user = await getCurrentUser();

  if (user?.email) {
    redirect("/activity");
  }

  const droplets = await getRandomFunFactDroplet();
  const droplet = droplets[Math.floor(Math.random() * droplets.length)];

  return (
    <GradientBackground className="px-12 lg:px-24">
      <div className="mx-auto max-w-6xl">
        {/* Top row: hero text left, sailboat right */}
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
          <div>
            <h1
              className="text-4xl leading-tight font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white"
              role="heading"
            >
              Reinforce Your
              <br />
              Learning.
            </h1>
            <p className="mt-6 text-base leading-7 text-slate-600 dark:text-slate-400">
              Chart your course through Khoury College. Explore bite-sized
              droplets of knowledge, navigate learning voyages, and discover
              skills to carry you forward.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="bg-[#2D7597] text-white hover:bg-[#255e78]"
                after={<ArrowRightIcon />}
                asChild
              >
                <Link href="/explore">Start Exploring</Link>
              </Button>
              {user?.roles?.some(
                (role) =>
                  role === "Content Creator" ||
                  role === "Faculty" ||
                  role === "System Admin",
              ) && (
                <Link href="/my-content" className={outlineLinkCls}>
                  Create a Droplet <ArrowRightIcon className="h-4 w-4" />
                </Link>
              )}
              {user?.roles?.some((role) => role === "User") &&
                !user?.roles?.some(
                  (role) =>
                    role === "Content Creator" ||
                    role === "Faculty" ||
                    role === "System Admin",
                ) && (
                  <Link href="/creation-request" className={outlineLinkCls}>
                    Request Creation Role <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                )}
              {!user && (
                <Link href="/request-access" className={outlineLinkCls}>
                  Request Access <ArrowRightIcon className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

          {/* Right: Animated Odyssey sailboat */}
          <div className="hidden items-center justify-center lg:flex">
            <AnimatedSailboat />
          </div>
        </div>

        {/* Fun Fact — full width below */}
        {user && droplet && (
          <div className="mt-8">
            <FunFact droplet={droplet} />
          </div>
        )}
      </div>
    </GradientBackground>
  );
}
