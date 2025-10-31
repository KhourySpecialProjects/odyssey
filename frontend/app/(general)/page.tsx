import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { GradientBackground } from "@/components/gradient-bg";
import { FunFact } from "@/components/droplets/fun-fact";
import { getRandomFunFactDroplet } from "@/lib/requests/droplet";

export default async function HomeRoute() {
  const user = await getCurrentUser();

  const droplets = await getRandomFunFactDroplet();
  const droplet = droplets[Math.floor(Math.random() * droplets.length)];

  return (
    <GradientBackground className="flex-grow">
      <div className="isolate px-6 lg:px-8">
        <div
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
          ></div>
        </div>

        <div className="mx-auto max-w-2xl py-0 lg:py-4">
          <div className="text-center">
            <h1
              className="text-4xl font-black tracking-tight text-balance text-slate-900 sm:text-6xl dark:text-white"
              role="heading"
            >
              Reinforce Your Learning and Fuel Your Future
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">
              Odyssey is a new platform designed to provide on-demand access to
              modern knowledge and skills pertinent to {"today's"} undergraduate
              Khoury students.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-x-6 gap-y-3 md:flex-row">
              <Button
                size="lg"
                className="dark:border dark:border-slate-500 dark:bg-slate-800 dark:text-white dark:hover:text-black"
                after={<ArrowRightIcon />}
                asChild
              >
                <Link href="/explore">Explore</Link>
              </Button>
              {user?.roles?.some((role) => role !== "Content Creator") && (
                <Button
                  size="lg"
                  className="bg-sky-200 text-slate-900 hover:bg-sky-300 dark:bg-blue-400 dark:text-slate-900 dark:hover:bg-blue-500"
                  after={<ArrowRightIcon />}
                  asChild
                >
                  <Link href="/my-content">Create a Droplet</Link>
                </Button>
              )}
              {!user && (
                <Button
                  size="lg"
                  className="dark:bg-black dark:text-white dark:hover:text-black"
                  after={<ArrowRightIcon />}
                  asChild
                >
                  <Link href="/request-access">Request Access</Link>
                </Button>
              )}
            </div>
            {user && droplet && <FunFact droplet={droplet} />}
          </div>
        </div>

        <div
          className="absolute inset-x-0 top-[calc(100%-18rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-40rem)]"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
          ></div>
        </div>
      </div>
    </GradientBackground>
  );
}
