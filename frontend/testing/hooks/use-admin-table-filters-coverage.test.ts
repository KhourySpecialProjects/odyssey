/**
 * Coverage tests for hooks/use-admin-table-filters.ts
 *
 * Tests: initial state, search debounce (mocked synchronous), sort
 * apply/reset, filter apply/reset, pagination resets on filter change,
 * empty state.
 *
 * The hook uses lodash/debounce with a 400 ms delay. Rather than
 * `jest.useFakeTimers()` (which crashes a worker process under jest 29
 * + renderHook in this environment), we mock lodash/debounce so the
 * debounced function fires synchronously. This is the standard pattern
 * for unit-testing debounced React hooks and lets every test run in
 * real time without timer manipulation.
 *
 * IMPORTANT: Config objects must be built OUTSIDE the renderHook
 * callback. Calling defaultConfig() inside the callback creates a new
 * object on every React render cycle, which prevents act() from
 * settling under Node 24 + jest 29 + React 18.
 */

// Mock lodash/debounce so the search-debounce fires synchronously.
// Must be hoisted before any imports of the hook.
jest.mock("lodash/debounce", () => {
  return (fn: (...args: unknown[]) => unknown) => {
    const debouncedFn = (...args: unknown[]) => fn(...args);
    debouncedFn.cancel = jest.fn();
    return debouncedFn;
  };
});

import { renderHook, act } from "@testing-library/react";
import { useAdminTableFilters } from "@/hooks/use-admin-table-filters";

// ---------------------------------------------------------------------------
// Helpers / fixtures
// ---------------------------------------------------------------------------

interface Item {
  name: string;
  category: string;
}

const ITEMS: Item[] = [
  { name: "Alpha", category: "A" },
  { name: "Beta", category: "B" },
  { name: "Gamma", category: "A" },
  { name: "Delta", category: "B" },
  { name: "Epsilon", category: "A" },
  { name: "Zeta", category: "B" },
  { name: "Eta", category: "A" },
  { name: "Theta", category: "B" },
  { name: "Iota", category: "A" },
  { name: "Kappa", category: "B" },
];

function searchFn(item: Item, query: string): boolean {
  return item.name.toLowerCase().includes(query);
}

function sortFn(items: Item[], sortBy: string): Item[] {
  if (sortBy === "name-desc") {
    return [...items].sort((a, b) => b.name.localeCompare(a.name));
  }
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

function filterFn(item: Item, filters: string[]): boolean {
  return filters.includes(item.category);
}

function makeEvent(value: string): React.ChangeEvent<HTMLInputElement> {
  return { target: { value } } as React.ChangeEvent<HTMLInputElement>;
}

function defaultConfig(
  overrides: Partial<Parameters<typeof useAdminTableFilters<Item>>[0]> = {},
) {
  return {
    items: ITEMS,
    searchFn,
    sortFn,
    defaultSort: "name-asc",
    itemsPerPage: 8,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useAdminTableFilters", () => {
  // ── Initial state ────────────────────────────────────────────────────────

  describe("initial state", () => {
    it("returns all items sorted by default on first render", () => {
      const config = defaultConfig();
      const { result } = renderHook(() => useAdminTableFilters(config));

      expect(result.current.searchTerm).toBe("");
      expect(result.current.draftSortBy).toBe("name-asc");
      expect(result.current.draftFilters).toEqual([]);
      expect(result.current.hasActiveFilters).toBe(false);
      expect(result.current.currentPage).toBe(1);
    });

    it("calculates totalPages correctly", () => {
      const config = defaultConfig();
      const { result } = renderHook(() => useAdminTableFilters(config));

      // 10 items, 8 per page → 2 pages
      expect(result.current.totalPages).toBe(2);
    });

    it("returns only the first page of items", () => {
      const config = defaultConfig();
      const { result } = renderHook(() => useAdminTableFilters(config));

      expect(result.current.pageItems).toHaveLength(8);
    });

    it("uses defaultSort prop as initial sort value", () => {
      const config = defaultConfig({ defaultSort: "name-desc" });
      const { result } = renderHook(() => useAdminTableFilters(config));

      expect(result.current.draftSortBy).toBe("name-desc");
    });

    it("respects custom itemsPerPage", () => {
      const config = defaultConfig({ itemsPerPage: 3 });
      const { result } = renderHook(() => useAdminTableFilters(config));

      expect(result.current.pageItems).toHaveLength(3);
      expect(result.current.totalPages).toBe(4); // ceil(10/3) = 4
    });
  });

  // ── Empty / zero-item state ──────────────────────────────────────────────

  describe("empty items", () => {
    it("handles an empty items array without errors", () => {
      const config = defaultConfig({ items: [] });
      const { result } = renderHook(() => useAdminTableFilters(config));

      expect(result.current.pageItems).toHaveLength(0);
      expect(result.current.totalPages).toBe(0);
    });
  });

  // ── Pagination ───────────────────────────────────────────────────────────

  describe("pagination", () => {
    it("setCurrentPage navigates to a different page", () => {
      const config = defaultConfig();
      const { result } = renderHook(() => useAdminTableFilters(config));

      act(() => {
        result.current.setCurrentPage(2);
      });

      expect(result.current.currentPage).toBe(2);
      expect(result.current.pageItems).toHaveLength(2); // items 9 & 10
    });
  });

  // ── Search (debounced — mocked synchronous) ─────────────────────────────

  describe("search", () => {
    it("updates searchTerm immediately on input", () => {
      const config = defaultConfig();
      const { result } = renderHook(() => useAdminTableFilters(config));

      act(() => {
        result.current.handleSearch(makeEvent("al"));
      });

      // searchTerm state updates immediately
      expect(result.current.searchTerm).toBe("al");
    });

    it("filters items when search input changes", () => {
      const config = defaultConfig();
      const { result } = renderHook(() => useAdminTableFilters(config));

      act(() => {
        result.current.handleSearch(makeEvent("alpha"));
      });

      expect(result.current.pageItems).toHaveLength(1);
      expect(result.current.pageItems[0].name).toBe("Alpha");
    });

    it("resets to page 1 after search completes", () => {
      const config = defaultConfig();
      const { result } = renderHook(() => useAdminTableFilters(config));

      // Navigate away from page 1 first
      act(() => {
        result.current.setCurrentPage(2);
      });

      act(() => {
        result.current.handleSearch(makeEvent("alpha"));
      });

      expect(result.current.currentPage).toBe(1);
    });

    it("returns empty results when search matches nothing", () => {
      const config = defaultConfig();
      const { result } = renderHook(() => useAdminTableFilters(config));

      act(() => {
        result.current.handleSearch(makeEvent("zzz_no_match"));
      });

      expect(result.current.pageItems).toHaveLength(0);
      expect(result.current.totalPages).toBe(0);
    });

    it("clears search when empty string is entered", () => {
      const config = defaultConfig();
      const { result } = renderHook(() => useAdminTableFilters(config));

      // Search then clear
      act(() => {
        result.current.handleSearch(makeEvent("alpha"));
      });

      act(() => {
        result.current.handleSearch(makeEvent(""));
      });

      expect(result.current.pageItems).toHaveLength(8);
    });
  });

  // ── Sort ─────────────────────────────────────────────────────────────────

  describe("sort", () => {
    it("setDraftSortBy updates draftSortBy without affecting active sort", () => {
      const config = defaultConfig();
      const { result } = renderHook(() => useAdminTableFilters(config));

      act(() => {
        result.current.setDraftSortBy("name-desc");
      });

      expect(result.current.draftSortBy).toBe("name-desc");
      // Items should still be sorted asc (active sort unchanged)
      expect(result.current.pageItems[0].name).toBe("Alpha");
    });

    it("handleSortApply commits the draft sort and re-sorts items", () => {
      const config = defaultConfig();
      const { result } = renderHook(() => useAdminTableFilters(config));

      act(() => {
        result.current.setDraftSortBy("name-desc");
      });
      act(() => {
        result.current.handleSortApply();
      });

      // Items should now be sorted descending
      expect(result.current.pageItems[0].name).toBe("Zeta");
    });

    it("handleSortApply resets to page 1", () => {
      const config = defaultConfig();
      const { result } = renderHook(() => useAdminTableFilters(config));

      act(() => {
        result.current.setCurrentPage(2);
      });

      act(() => {
        result.current.setDraftSortBy("name-desc");
      });
      act(() => {
        result.current.handleSortApply();
      });

      expect(result.current.currentPage).toBe(1);
    });

    it("handleSortReset reverts to defaultSort", () => {
      const config = defaultConfig({ defaultSort: "name-asc" });
      const { result } = renderHook(() => useAdminTableFilters(config));

      act(() => {
        result.current.setDraftSortBy("name-desc");
      });
      act(() => {
        result.current.handleSortApply();
      });

      act(() => {
        result.current.handleSortReset();
      });

      expect(result.current.draftSortBy).toBe("name-asc");
      expect(result.current.pageItems[0].name).toBe("Alpha");
    });
  });

  // ── Filter ───────────────────────────────────────────────────────────────

  describe("filter", () => {
    it("toggleDraftFilter adds a value not already in draftFilters", () => {
      const config = defaultConfig({ filterFn });
      const { result } = renderHook(() => useAdminTableFilters(config));

      act(() => {
        result.current.toggleDraftFilter("A");
      });

      expect(result.current.draftFilters).toEqual(["A"]);
    });

    it("toggleDraftFilter removes a value already in draftFilters", () => {
      const config = defaultConfig({ filterFn });
      const { result } = renderHook(() => useAdminTableFilters(config));

      act(() => {
        result.current.toggleDraftFilter("A");
      });

      act(() => {
        result.current.toggleDraftFilter("A");
      });

      expect(result.current.draftFilters).toEqual([]);
    });

    it("handleFilterApply commits draftFilters and filters items", () => {
      const config = defaultConfig({ filterFn });
      const { result } = renderHook(() => useAdminTableFilters(config));

      act(() => {
        result.current.toggleDraftFilter("A");
      });
      act(() => {
        result.current.handleFilterApply();
      });

      expect(result.current.hasActiveFilters).toBe(true);
      // Only category A items: Alpha, Gamma, Epsilon, Eta, Iota = 5
      expect(result.current.pageItems).toHaveLength(5);
    });

    it("handleFilterApply resets pagination to page 1", () => {
      const config = defaultConfig({ filterFn });
      const { result } = renderHook(() => useAdminTableFilters(config));

      act(() => {
        result.current.setCurrentPage(2);
      });

      act(() => {
        result.current.toggleDraftFilter("A");
      });
      act(() => {
        result.current.handleFilterApply();
      });

      expect(result.current.currentPage).toBe(1);
    });

    it("handleFilterReset clears all filters and shows all items", () => {
      const config = defaultConfig({ filterFn });
      const { result } = renderHook(() => useAdminTableFilters(config));

      act(() => {
        result.current.toggleDraftFilter("A");
      });
      act(() => {
        result.current.handleFilterApply();
      });

      act(() => {
        result.current.handleFilterReset();
      });

      expect(result.current.hasActiveFilters).toBe(false);
      expect(result.current.draftFilters).toEqual([]);
      expect(result.current.pageItems).toHaveLength(8);
    });

    it("hasActiveFilters is false when no filters are applied", () => {
      const config = defaultConfig({ filterFn });
      const { result } = renderHook(() => useAdminTableFilters(config));

      expect(result.current.hasActiveFilters).toBe(false);
    });

    it("can toggle multiple filters independently", () => {
      const config = defaultConfig({ filterFn });
      const { result } = renderHook(() => useAdminTableFilters(config));

      act(() => {
        result.current.toggleDraftFilter("A");
        result.current.toggleDraftFilter("B");
      });

      expect(result.current.draftFilters).toEqual(["A", "B"]);

      act(() => {
        result.current.handleFilterApply();
      });

      // All 10 items match A or B
      expect(result.current.pageItems).toHaveLength(8);
    });
  });

  // ── items prop change (re-apply) ─────────────────────────────────────────

  describe("items prop change", () => {
    it("re-applies filters when items prop changes", () => {
      const initialItems = ITEMS.slice(0, 5);
      const { result, rerender } = renderHook(
        ({ items }) =>
          useAdminTableFilters({
            items,
            searchFn,
            sortFn,
            defaultSort: "name-asc",
          }),
        { initialProps: { items: initialItems } },
      );

      expect(result.current.pageItems).toHaveLength(5);

      rerender({ items: ITEMS });

      expect(result.current.pageItems).toHaveLength(8); // 8 per page of 10
    });
  });

  // ── filterFn defaults ────────────────────────────────────────────────────

  describe("filterFn default (no filterFn provided)", () => {
    it("works without filterFn config — all items pass through", () => {
      const config = {
        items: ITEMS,
        searchFn,
        sortFn,
      };
      const { result } = renderHook(() => useAdminTableFilters(config));

      // No filterFn: default is ALWAYS_PASS, so all items pass
      expect(result.current.pageItems).toHaveLength(8);
    });
  });
});
