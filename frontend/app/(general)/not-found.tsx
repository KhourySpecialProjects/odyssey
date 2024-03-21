import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

export default function NotFoundRoute() {
  return (
    <div className="w-full max-w-5xl p-8 mx-auto">
      <div className="grid min-h-full place-items-center bg-white px-6 py-24 sm:py-32 lg:px-8">
        <div className="text-center">
          <p className="text-base uppercase font-semibold text-indigo-600">
            404
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Page Not Found
          </h1>
          <p className="mt-6 text-base leading-7 text-gray-600">
            The requested resource does not exist, or you do not have access to
            it.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button size="lg" after={<ArrowRightIcon />} asChild>
              <Link href="/">Start Over</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
