import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

type DebugState = {
  debug: boolean;
  toggle: () => void;
};

const useDebugStore = create<DebugState>()(
  devtools(
    persist(
      (set) => ({
        debug: false,
        toggle: () => set((state) => ({ debug: !state.debug })),
      }),
      {
        name: "debug-storage",
      }
    )
  )
);

export default useDebugStore;
