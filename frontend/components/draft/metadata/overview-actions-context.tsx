"use client";

import { createContext, useContext, useRef, useState } from "react";

interface OverviewActionsContextValue {
  editorActionsRef: React.MutableRefObject<{
    setLink: () => void;
    unsetLink: () => void;
  } | null>;
  isLink: boolean;
  setIsLink: (val: boolean) => void;
}

const OverviewActionsContext =
  createContext<OverviewActionsContextValue | null>(null);

export function OverviewActionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const editorActionsRef = useRef<{
    setLink: () => void;
    unsetLink: () => void;
  } | null>(null);
  const [isLink, setIsLink] = useState(false);

  return (
    <OverviewActionsContext.Provider
      value={{ editorActionsRef, isLink, setIsLink }}
    >
      {children}
    </OverviewActionsContext.Provider>
  );
}

export function useOverviewActions() {
  return useContext(OverviewActionsContext);
}
