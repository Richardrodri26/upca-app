import { createSearchParamsCache, parseAsString } from "nuqs/server";

// ────────────────────────────────────────
// Shared parsers
// ────────────────────────────────────────

/** Free-text search, defaults to empty string */
export const searchParser = parseAsString.withDefault("");

/** Department filter, defaults to "all" */
export const departmentParser = parseAsString.withDefault("all");

/** Manual status filter, defaults to "all" */
export const statusParser = parseAsString.withDefault("all");

// ────────────────────────────────────────
// Positions page search params (server-side cache)
// ────────────────────────────────────────

export const positionsSearchParams = {
  search: searchParser,
  department: departmentParser,
};

export const positionsCache = createSearchParamsCache(positionsSearchParams);

// ────────────────────────────────────────
// Manuals page search params (server-side cache)
// ────────────────────────────────────────

export const manualsSearchParams = {
  status: statusParser,
};

export const manualsCache = createSearchParamsCache(manualsSearchParams);
