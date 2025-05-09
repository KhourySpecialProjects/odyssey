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
  }, []);

  return { open, setOpen };
}
