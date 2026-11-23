import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether the media query matches. It's false on the server and while
 * hydrating, so the server's HTML still matches, but a component mounted later
 * reads the real value on its first render: the Mentor sheet would otherwise
 * mount as a phone's modal on a wide screen and take focus (ODY-889).
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
