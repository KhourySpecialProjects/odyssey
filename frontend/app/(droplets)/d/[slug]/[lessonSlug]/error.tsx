"use client";

import {
  Message,
  MessageActions,
  MessageDescription,
  MessageHeader,
} from "@/components/message";
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
    <Message>
      <MessageHeader subtitle={error.name} title="Something went wrong!" />
      <MessageDescription>{error.message}</MessageDescription>
      <MessageActions>
        <Button
          size="lg"
          before={<RefreshCwIcon />}
          onClick={
            // Attempt to recover by trying to re-render the segment
            () => reset()
          }
        >
          Try again
        </Button>
        <Button size="lg" variant="link" after={<ArrowRightIcon />} asChild>
          <Link href="/">Start over</Link>
        </Button>
      </MessageActions>
    </Message>
  );
}
