export type SortBy = "updatedAt" | "createdAt" | "title";
export type SortDirection = "asc" | "desc";

export const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "updatedAt", label: "Last updated" },
  { value: "createdAt", label: "Date created" },
  { value: "title", label: "Title" },
];

// The direction a sort starts with when it's chosen: newest first for dates,
// A → Z for titles
export const DEFAULT_DIRECTION: Record<SortBy, SortDirection> = {
  updatedAt: "desc",
  createdAt: "desc",
  title: "asc",
};

// Describes the current order in words rather than as "ascending/descending"
export function directionLabel(sortBy: SortBy, direction: SortDirection) {
  if (sortBy === "title") return direction === "asc" ? "A → Z" : "Z → A";
  return direction === "desc" ? "Newest first" : "Oldest first";
}

type SortableNote = { title: string; createdAt: string; updatedAt: string };

export function sortNotes<T extends SortableNote>(
  notes: T[],
  sortBy: SortBy,
  direction: SortDirection,
): T[] {
  return [...notes].sort((a, b) => {
    const result =
      sortBy === "title"
        ? // numeric: "Day 2" sorts before "Day 10"; base: ignores case
          a.title.localeCompare(b.title, undefined, {
            numeric: true,
            sensitivity: "base",
          })
        : new Date(a[sortBy]).getTime() - new Date(b[sortBy]).getTime();
    return direction === "asc" ? result : -result;
  });
}
