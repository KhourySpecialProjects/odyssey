"use client";

import * as React from "react";
import { Button } from "../ui/button"; 
import useDebugStore from "@/stores/debug-toggle-store";
import { BugIcon } from "lucide-react";

const DebugToggle = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Button>>(
  ({ className, ...props }, ref) => {
    const toggleDebug = useDebugStore((state) => state.toggle);
    if (process.env.NODE_ENV !== "development") return null;

    return (
      <Button
        ref={ref}
        onClick={toggleDebug}
        className={`fixed z-50 -bottom-1 -right-1 ${className}`}
        size="icon"
        aria-label="Debug"
        {...props}
      >
        <BugIcon className="w-4" />
      </Button>
    );
  }
);

DebugToggle.displayName = "DebugToggle";

export default DebugToggle;
