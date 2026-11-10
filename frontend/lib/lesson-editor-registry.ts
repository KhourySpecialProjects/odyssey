// Tracks mounted lesson editors so the sidebar's Preview link knows whether
// anyone can answer a `flush-save-request` (ODY-471). On the Overview and scan
// pages no editor is mounted, so Preview skips the wait.
let mountedEditors = 0;

/** Registers a mounted lesson editor; call the returned function on unmount. */
export function registerLessonEditor(): () => void {
  mountedEditors++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    mountedEditors--;
  };
}

export function hasLessonEditor(): boolean {
  return mountedEditors > 0;
}
