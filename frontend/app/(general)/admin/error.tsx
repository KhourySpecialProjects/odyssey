"use client";

import { Button } from "@/components/ui/button";
import { ArrowRightIcon, RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-full place-items-center bg-white px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <p className="text-base uppercase font-semibold text-indigo-600">
          {error.name}
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Something went wrong!
        </h1>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button
            before={<RefreshCwIcon />}
            size="lg"
            onClick={
              // Attempt to recover by trying to re-render the segment
              () => reset()
            }
          >
            Try again
          </Button>
          <Button variant="link" after={<ArrowRightIcon />} asChild>
            <Link href="/">Start over</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
