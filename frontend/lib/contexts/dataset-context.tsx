"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Dataset } from "@/types";

export type DatasetContextValue = {
  datasets: Dataset[];
};

const DatasetContext = createContext<DatasetContextValue>({ datasets: [] });

export function DatasetProvider({
  datasets,
  children,
}: {
  datasets: Dataset[];
  children: ReactNode;
}) {
  return (
    <DatasetContext.Provider value={{ datasets }}>
      {children}
    </DatasetContext.Provider>
  );
}

export function useDatasets(): DatasetContextValue {
  return useContext(DatasetContext);
}
