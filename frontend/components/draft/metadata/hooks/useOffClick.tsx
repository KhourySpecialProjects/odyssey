"use client";

import { useEffect, useState } from "react";

export function useOffClick(
  ref: React.RefObject<HTMLElement>,
  func: () => void = () => {},
  initialOpen: boolean = false,
) {
  const [open, setOpen] = useState(initialOpen);

  const handleClickOutside = (event: MouseEvent) => {
    if (ref.current && !ref.current.contains(event.target as Node)) {
      setOpen(false);
      func();
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listener is bound once on mount; func and setOpen are read through the first render's closure
  }, []);

  return { open, setOpen };
}
