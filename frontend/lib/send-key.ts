import type { KeyboardEvent } from "react";

/** Plain Enter that sends; not Shift+Enter, nor the Enter ending an IME composition (Safari: keyCode 229). */
export const isSendEnter = (e: KeyboardEvent) =>
  e.key === "Enter" &&
  !e.shiftKey &&
  !e.nativeEvent.isComposing &&
  e.keyCode !== 229;
