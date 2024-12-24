import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

export default function HomeRoute() {
  return (
    <div className="relative px-6 bg-white isolate lg:px-8">
      <div
        className="absolute inset-x-0 overflow-hidden -top-40 -z-10 transform-gpu blur-3xl sm:-top-80"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#98D1B5] to-[#A0E0EF] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        ></div>
      </div>

      <div className="max-w-2xl py-20 mx-auto sm:py-36 lg:py-44">
        <div className="hidden sm:mb-8 sm:flex sm:justify-center">
          <div className="relative px-3 py-1 text-sm leading-6 rounded-full text-slate-600 ring-1 ring-slate-900/10 hover:ring-slate-900/20">
            <strong>Coming soon</strong> &mdash; request access today!
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-6xl text-balance">
            Reinforce Your Learning and Fuel Your Future
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Odyssey is a new platform designed to provide on-demand access to
            modern knowledge and skills pertinent to {"today’s"} undergraduate
            Khoury students.
          </p>
          <div className="flex flex-col items-center justify-center mt-10 md:flex-row gap-x-6 gap-y-3">
            <Button size="lg" after={<ArrowRightIcon />} asChild>
              <Link href="/explore">Explore</Link>
            </Button>
            <Button size="lg" variant="link" after={<ArrowRightIcon />} asChild>
              <Link href="/request-access">Request Access</Link>
            </Button>
          </div>
        </div>
      </div>

      <div
        className="absolute inset-x-0 top-[calc(100%-18rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-40rem)]"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#98D1B5] to-[#FF9966] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        ></div>
      </div>
    </div>
  );
}
