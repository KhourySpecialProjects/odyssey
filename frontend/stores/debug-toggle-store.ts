import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

type DebugState = {
  debugModeEnabled: boolean;
  toggle: () => void;
};

const useDebugStore = create<DebugState>()(
  devtools(
    persist(
      (set) => ({
        debugModeEnabled: false,
        toggle: () =>
          set((state) => ({ debugModeEnabled: !state.debugModeEnabled })),
      }),
      {
        name: "debug-toggle-storage",
      },
    ),
  ),
);

export default useDebugStore;
