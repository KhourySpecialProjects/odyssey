"use client";

import { useEffect, useState } from "react";

export function useOffClick(
  ref: React.RefObject<HTMLElement>,
  func: () => void = () => {},
) {
  const [open, setOpen] = useState(false);

  const handleClickOutside = (event: any) => {
    if (ref.current && !ref.current.contains(event.target)) {
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
