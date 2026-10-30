"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { Band } from "@/lib/review-panel/colors";
import type { AiFinding } from "@/types";

export type OpenDetail = {
  band: Band;
  findings: { finding: AiFinding; number: number }[];
};

type ReviewFocus = {
  openDetail: OpenDetail | null;
  setOpenDetail: Dispatch<SetStateAction<OpenDetail | null>>;
};

const ReviewFocusContext = createContext<ReviewFocus | null>(null);

/**
 * The criterion detail open in the panel (ODY-849): the lesson draws its
 * findings. `active` is false while the panel is a rail, so no marks show.
 */
export function ReviewFocusProvider({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  const [detail, setOpenDetail] = useState<OpenDetail | null>(null);
  const value = useMemo(
    () => ({ openDetail: active ? detail : null, setOpenDetail }),
    [active, detail, setOpenDetail],
  );
  return (
    <ReviewFocusContext.Provider value={value}>
      {children}
    </ReviewFocusContext.Provider>
  );
}

/** The panel's open detail, or null outside a provider */
export function useReviewFocus(): ReviewFocus | null {
  return useContext(ReviewFocusContext);
}
