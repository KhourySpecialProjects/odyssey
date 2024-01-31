"use client";

import useDebugStore from "@/stores/debug-store";
import { Button, Tooltip } from "@lemonsqueezy/wedges";
import { BugIcon } from "lucide-react";

export function DebugBanner() {
  const isDebugEnabled = useDebugStore((state) => state.debug);
  const toggleDebug = useDebugStore((state) => state.toggle);

  return (
    <>
      {isDebugEnabled ? (
        <p className="py-2 w-full text-center text-sm uppercase font-medium text-black bg-gray-100">
          Debug Mode Enabled
        </p>
      ) : null}

      <Tooltip content="Toggle debugging">
        <Button
          onClick={toggleDebug}
          className="fixed bottom-2 left-2"
          size="xs-icon"
          aria-label="Debug"
        >
          <BugIcon className="w-4" />
        </Button>
      </Tooltip>
    </>
  );
}
