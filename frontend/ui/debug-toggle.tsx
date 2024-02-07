"use client";

import useDebugStore from "@/stores/debug-store";
import { Button, Tooltip } from "@lemonsqueezy/wedges";
import { BugIcon } from "lucide-react";

export default function DebugToggle() {
  const toggleDebug = useDebugStore((state) => state.toggle);

  return (
    <Tooltip content="Toggle debugging">
      <Button
        onClick={toggleDebug}
        className="z-50 fixed bottom-2 right-2"
        size="xs-icon"
        aria-label="Debug"
      >
        <BugIcon className="w-4" />
      </Button>
    </Tooltip>
  );
}
