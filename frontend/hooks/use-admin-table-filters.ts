import { useCallback, useEffect, useRef, useState } from "react";
import debounce from "lodash/debounce";

interface UseAdminTableFiltersConfig<T> {
  items: T[];
  searchFn: (item: T, query: string) => boolean;
  sortFn: (items: T[], sortBy: string) => T[];
  filterFn?: (item: T, activeFilters: string[]) => boolean;
  defaultSort?: string;
  itemsPerPage?: number;
}

interface UseAdminTableFiltersReturn<T> {
  // Pagination
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  pageItems: T[];

  // Search
  searchTerm: string;
  handleSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;

  // Sort (draft/active pattern)
  draftSortBy: string;
  setDraftSortBy: (value: string) => void;
  handleSortApply: () => void;
  handleSortReset: () => void;

  // Filter (draft/active pattern)
  draftFilters: string[];
  toggleDraftFilter: (value: string) => void;
  handleFilterApply: () => void;
  handleFilterReset: () => void;
  hasActiveFilters: boolean;
}

export function useAdminTableFilters<T>(
  config: UseAdminTableFiltersConfig<T>,
): UseAdminTableFiltersReturn<T> {
  const {
    items,
    searchFn,
    sortFn,
    filterFn = () => true,
    defaultSort = "name-asc",
    itemsPerPage = 8,
  } = config;

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredItems, setFilteredItems] = useState<T[]>(items);

  // Active (committed) sort/filter
  const [activeSortBy, setActiveSortBy] = useState(defaultSort);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  // Draft (in-popout) sort/filter — only committed on Apply
  const [draftSortBy, setDraftSortBy] = useState(defaultSort);
  const [draftFilters, setDraftFilters] = useState<string[]>([]);

  // Refs to keep debounced closure from going stale
  const activeSortByRef = useRef(activeSortBy);
  activeSortByRef.current = activeSortBy;

  const activeFiltersRef = useRef(activeFilters);
  activeFiltersRef.current = activeFilters;

  const applyFiltersAndSort = useCallback(
    (search: string, sort: string, filters: string[]) => {
      let result = [...items];

      if (search.trim()) {
        const q = search.toLowerCase();
        result = result.filter((item) => searchFn(item, q));
      }

      if (filters.length > 0) {
        result = result.filter((item) => filterFn(item, filters));
      }

      result = sortFn(result, sort);

      setFilteredItems(result);
      setCurrentPage(1);
    },
    [items, searchFn, sortFn, filterFn],
  );

  // Keep a ref to the latest applyFiltersAndSort so debounce doesn't go stale
  const callbackRef = useRef(applyFiltersAndSort);
  callbackRef.current = applyFiltersAndSort;

  const debouncedSearch = useRef(
    debounce((value: string) => {
      callbackRef.current(
        value,
        activeSortByRef.current,
        activeFiltersRef.current,
      );
    }, 400),
  ).current;

  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);

  // Re-apply filters when items prop changes (e.g., server revalidation)
  useEffect(() => {
    applyFiltersAndSort(searchTerm, activeSortBy, activeFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    debouncedSearch(e.target.value);
  };

  const handleSortApply = () => {
    setActiveSortBy(draftSortBy);
    applyFiltersAndSort(searchTerm, draftSortBy, activeFilters);
  };

  const handleSortReset = () => {
    setDraftSortBy(defaultSort);
    setActiveSortBy(defaultSort);
    applyFiltersAndSort(searchTerm, defaultSort, activeFilters);
  };

  const handleFilterApply = () => {
    setActiveFilters(draftFilters);
    applyFiltersAndSort(searchTerm, activeSortBy, draftFilters);
  };

  const handleFilterReset = () => {
    setDraftFilters([]);
    setActiveFilters([]);
    applyFiltersAndSort(searchTerm, activeSortBy, []);
  };

  const toggleDraftFilter = (value: string) => {
    setDraftFilters((current) =>
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
    );
  };

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const pageItems = filteredItems.slice(start, start + itemsPerPage);

  return {
    currentPage,
    setCurrentPage,
    totalPages,
    pageItems,

    searchTerm,
    handleSearch,

    draftSortBy,
    setDraftSortBy,
    handleSortApply,
    handleSortReset,

    draftFilters,
    toggleDraftFilter,
    handleFilterApply,
    handleFilterReset,
    hasActiveFilters: activeFilters.length > 0,
  };
}
