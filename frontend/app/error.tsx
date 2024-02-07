"use client";

import { Button } from "@lemonsqueezy/wedges";
import { RefreshCwIcon } from "lucide-react";
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
    <div className="w-full max-w-5xl p-8 mx-auto">
      <h2 className="mb-2 font-bold">Something went wrong!</h2>
      <Button
        before={<RefreshCwIcon className="w-4" />}
        size="sm"
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
      >
        Try again
      </Button>
    </div>
  );
}
