"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryState, parseAsString } from "nuqs";

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type TableStateConfig = {
  /** URL param key for the search query */
  searchKey?: string;
  /** URL param key for the status filter */
  statusKey?: string;
  /** URL param key for the department filter */
  departmentKey?: string;
  /** Debounce delay in ms for the search input (default: 300) */
  searchDebounceMs?: number;
};

type TableState = {
  /** Current search value (debounced, synced to URL) */
  search: string;
  /** Raw search input value (instant, not debounced) */
  searchInput: string;
  /** Update the raw search input */
  setSearchInput: (value: string) => void;
  /** Current status filter */
  status: string;
  /** Update the status filter */
  setStatus: (value: string) => void;
  /** Current department filter */
  department: string;
  /** Update the department filter */
  setDepartment: (value: string) => void;
};

// ────────────────────────────────────────
// Hook
// ────────────────────────────────────────

/**
 * Generic hook that manages table filter state persisted in URL query params via nuqs.
 *
 * Features:
 * - Search with debounce (URL updated after delay, input feels instant)
 * - Status and department filters synced to URL
 * - Safe defaults: all params default to empty/all
 */
export function useTableState(config: TableStateConfig = {}): TableState {
  const {
    searchKey = "search",
    statusKey = "status",
    departmentKey = "department",
    searchDebounceMs = 300,
  } = config;

  // URL-synced state via nuqs
  const [search, setSearch] = useQueryState(searchKey, parseAsString.withDefault(""));
  const [status, setStatus] = useQueryState(statusKey, parseAsString.withDefault("all"));
  const [department, setDepartment] = useQueryState(departmentKey, parseAsString.withDefault("all"));

  // Local input state for instant typing feel
  const [searchInput, setSearchInput] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync input → URL with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput || null);
    }, searchDebounceMs);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, setSearch, searchDebounceMs]);

  // Sync URL → input (for browser back/forward, external URL changes)
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Convenience setters that clear the param when set to default
  const handleSetStatus = useCallback(
    (value: string) => {
      setStatus(value === "all" ? null : value);
    },
    [setStatus],
  );

  const handleSetDepartment = useCallback(
    (value: string) => {
      setDepartment(value === "all" ? null : value);
    },
    [setDepartment],
  );

  return {
    search,
    searchInput,
    setSearchInput,
    status,
    setStatus: handleSetStatus,
    department,
    setDepartment: handleSetDepartment,
  };
}
