"use client";

import { createContext, useContext, useState } from "react";

type SearchContextType = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
};

const SearchContext = createContext<SearchContextType>({
  searchQuery: "",
  setSearchQuery: () => {},
});

export function SearchProvider({
  children,
  initialQuery = "",
}: {
  children: React.ReactNode;
  // Explore starts from its ?q= so Back from a droplet keeps the search (ODY-865)
  initialQuery?: string;
}) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery }}>
      {children}
    </SearchContext.Provider>
  );
}

export const useSearch = () => useContext(SearchContext);
