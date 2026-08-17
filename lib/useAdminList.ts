"use client";

// One hook behind every searchable admin list.
//
// The admin lists had no search at all: finding one redirect among a hundred,
// or one order among a year's worth, meant Cmd-F on whatever the browser had
// rendered. Each list also re-implemented its own filtering when it had any.
//
// This gives them all the same behaviour:
//   • fuzzy search (Fuse.js — already a dependency for Smart Search, so the
//     typo tolerance and field weighting come for free rather than being
//     re-invented as a `.toLowerCase().includes()` that misses "aplha")
//   • a status filter with live counts
//   • optional sorting
//   • state mirrored into the query string, so a filtered list is a link you
//     can send someone, and Back actually goes back
//
// Filtering is client-side on purpose: every one of these endpoints already
// returns the full collection in one request, so searching in the browser is
// instant and needs no new API surface. If a collection ever outgrows that
// (orders, most likely), move it behind /api/admin/search.

import Fuse from "fuse.js";
import type { IFuseOptions } from "fuse.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type SortDirection = "asc" | "desc";

export interface AdminListFilter<T> {
  /** Query-string key and identity of this filter. */
  key: string;
  /** All option: `{ value: "all", label: "All" }` is added automatically. */
  options: { value: string; label: string }[];
  /** Which option a row belongs to; return null to exclude from all counts. */
  match: (item: T, value: string) => boolean;
  /** Option selected when the URL says nothing. Defaults to "all". */
  initial?: string;
}

export interface UseAdminListOptions<T> {
  items: T[];
  /**
   * Fields to search, Fuse-style. Strings or `{ name, weight }`; nested paths
   * ("hr_staff.first_name") work.
   */
  searchKeys: (string | { name: string; weight: number })[];
  filters?: AdminListFilter<T>[];
  /** Comparators by sort field. Ascending order; the hook reverses for desc. */
  sorts?: Record<string, (a: T, b: T) => number>;
  defaultSort?: { field: string; direction: SortDirection };
  /**
   * Persist search/filter/sort in the query string. On by default; pass a
   * prefix when two lists share one route.
   */
  syncUrl?: boolean;
  urlPrefix?: string;
}

export interface UseAdminListResult<T> {
  /** Rows to render — searched, filtered and sorted. */
  visible: T[];
  search: string;
  setSearch: (value: string) => void;
  /** Current value per filter key. */
  filterValues: Record<string, string>;
  setFilter: (key: string, value: string) => void;
  /** Options for `<FilterChips>`, with counts against the searched set. */
  filterOptions: (key: string) => { value: string; label: string; count: number }[];
  sortField: string | null;
  sortDirection: SortDirection;
  /** Toggles direction when the same field is clicked again. */
  toggleSort: (field: string) => void;
  total: number;
  shown: number;
  /** True when search or a filter is narrowing the list. */
  isFiltered: boolean;
  clearAll: () => void;
}

const ALL = "all";

/**
 * Threshold 0.4 is Fuse's middle ground: forgiving enough for a transposed
 * letter, tight enough that a three-letter query doesn't match everything.
 * ignoreLocation matters because matches here are usually mid-string
 * ("orange hoodie" in a long product name).
 */
const FUSE_OPTIONS: IFuseOptions<unknown> = {
  threshold: 0.4,
  ignoreLocation: true,
  minMatchCharLength: 2,
  useExtendedSearch: false,
};

export function useAdminList<T>({
  items,
  searchKeys,
  filters = [],
  sorts,
  defaultSort,
  syncUrl = true,
  urlPrefix = "",
}: UseAdminListOptions<T>): UseAdminListResult<T> {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const qKey = `${urlPrefix}q`;
  const sortKey = `${urlPrefix}sort`;
  const dirKey = `${urlPrefix}dir`;

  // Read the URL once on mount. After that this state is the source of truth
  // and pushes to the URL, so typing doesn't fight a re-read mid-keystroke.
  const initial = useRef({
    search: searchParams.get(qKey) ?? "",
    filters: Object.fromEntries(
      filters.map((f) => [
        f.key,
        searchParams.get(`${urlPrefix}${f.key}`) ?? f.initial ?? ALL,
      ]),
    ) as Record<string, string>,
    sortField: searchParams.get(sortKey) ?? defaultSort?.field ?? null,
    sortDirection: (searchParams.get(dirKey) as SortDirection | null) ??
      defaultSort?.direction ??
      "asc",
  });

  const [search, setSearch] = useState(initial.current.search);
  const [filterValues, setFilterValues] = useState(initial.current.filters);
  const [sortField, setSortField] = useState<string | null>(initial.current.sortField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    initial.current.sortDirection,
  );

  /* ── URL sync ───────────────────────────────────────────────────────────── */

  // Debounced so a typed query produces one history entry, not one per letter.
  useEffect(() => {
    if (!syncUrl) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);

      const set = (key: string, value: string, isDefault: boolean) => {
        if (isDefault || !value) params.delete(key);
        else params.set(key, value);
      };

      set(qKey, search, false);
      for (const f of filters) {
        const value = filterValues[f.key] ?? ALL;
        set(`${urlPrefix}${f.key}`, value, value === (f.initial ?? ALL));
      }
      set(sortKey, sortField ?? "", sortField === (defaultSort?.field ?? null));
      set(
        dirKey,
        sortDirection,
        !sortField || sortDirection === (defaultSort?.direction ?? "asc"),
      );

      const next = params.toString();
      if (next === window.location.search.replace(/^\?/, "")) return;
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }, 250);
    return () => clearTimeout(timer);
    // filters/sorts are static config; re-running on identity churn would
    // rewrite the URL on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterValues, sortField, sortDirection, syncUrl, pathname, router]);

  /* ── Search ─────────────────────────────────────────────────────────────── */

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        ...FUSE_OPTIONS,
        keys: searchKeys,
      } as IFuseOptions<T>),
    // searchKeys is a literal at every call site; stringify keeps the memo
    // stable without asking callers to wrap it in useMemo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, JSON.stringify(searchKeys)],
  );

  const searched = useMemo(() => {
    const query = search.trim();
    if (!query) return items;
    return fuse.search(query).map((hit) => hit.item);
  }, [fuse, items, search]);

  /* ── Filters ────────────────────────────────────────────────────────────── */

  const filtered = useMemo(() => {
    let pool = searched;
    for (const f of filters) {
      const value = filterValues[f.key] ?? ALL;
      if (value === ALL) continue;
      pool = pool.filter((item) => f.match(item, value));
    }
    return pool;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searched, filterValues]);

  /* ── Sort ───────────────────────────────────────────────────────────────── */

  const visible = useMemo(() => {
    if (!sortField || !sorts?.[sortField]) return filtered;
    const compare = sorts[sortField];
    const sorted = [...filtered].sort(compare);
    return sortDirection === "desc" ? sorted.reverse() : sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sortField, sortDirection]);

  /* ── Derived helpers ────────────────────────────────────────────────────── */

  const filterOptions = useCallback(
    (key: string) => {
      const f = filters.find((x) => x.key === key);
      if (!f) return [];
      // Counts are taken against the searched set, not the filtered one, so
      // the numbers tell you what switching a chip would show.
      return [
        { value: ALL, label: "All", count: searched.length },
        ...f.options.map((option) => ({
          ...option,
          count: searched.filter((item) => f.match(item, option.value)).length,
        })),
      ];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searched],
  );

  const setFilter = useCallback((key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleSort = useCallback(
    (field: string) => {
      if (field === sortField) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
    },
    [sortField],
  );

  const clearAll = useCallback(() => {
    setSearch("");
    setFilterValues(
      Object.fromEntries(filters.map((f) => [f.key, f.initial ?? ALL])) as Record<
        string,
        string
      >,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFiltered =
    search.trim().length > 0 ||
    filters.some((f) => (filterValues[f.key] ?? ALL) !== (f.initial ?? ALL));

  return {
    visible,
    search,
    setSearch,
    filterValues,
    setFilter,
    filterOptions,
    sortField,
    sortDirection,
    toggleSort,
    total: items.length,
    shown: visible.length,
    isFiltered,
    clearAll,
  };
}

/* ── Selection ─────────────────────────────────────────────────────────────── */

/**
 * Row selection for bulk actions. Kept separate from useAdminList so lists that
 * don't need it pay nothing, and so selections survive a search being typed
 * (they're pruned against the current items, not the visible ones).
 */
export function useRowSelection<T extends { id: string }>(items: T[]) {
  const [raw, setSelected] = useState<Set<string>>(new Set());

  // Ids that no longer exist are filtered out on read rather than pruned in an
  // effect: deleting a selected row would otherwise leave a phantom in the
  // count until a re-render caught up.
  const selected = useMemo(() => {
    if (raw.size === 0) return raw;
    const live = new Set(items.map((i) => i.id));
    const next = new Set([...raw].filter((id) => live.has(id)));
    return next.size === raw.size ? raw : next;
  }, [raw, items]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((ids: string[]) => {
    setSelected((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(ids);
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  return { selected, toggle, toggleAll, clear, count: selected.size };
}
