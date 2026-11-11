// Helpers for turning the flat folder and note lists returned by
// getNoteFolderTree into a nested tree on the client. Folders reference their
// parent through `parentFolderId` (null = top level) and can be nested to any
// depth, so the tree is built in memory rather than with nested queries.

type TreeFolder = { id: string; parentFolderId: string | null };

// Groups folders by their parent id
export function buildChildrenMap<F extends TreeFolder>(folders: F[]) {
  const map = new Map<string | null, F[]>();
  for (const folder of folders) {
    const siblings = map.get(folder.parentFolderId);
    if (siblings) {
      siblings.push(folder);
    } else {
      map.set(folder.parentFolderId, [folder]);
    }
  }
  return map;
}

// Groups items (notes) by the folder they are in
export function buildItemsMap<T extends { folderId: string | null }>(
  items: T[],
) {
  const map = new Map<string | null, T[]>();
  for (const item of items) {
    const existing = map.get(item.folderId);
    if (existing) {
      existing.push(item);
    } else {
      map.set(item.folderId, [item]);
    }
  }
  return map;
}

// Every folder below `rootId`, at any depth (not including `rootId` itself).
// Used to stop a folder from being moved into its own subtree.
export function getDescendantFolderIds<F extends TreeFolder>(
  folders: F[],
  rootId: string,
) {
  const childrenMap = buildChildrenMap(folders);
  const result = new Set<string>();
  const stack = [rootId];

  while (stack.length > 0) {
    const current = stack.pop() as string;
    for (const child of childrenMap.get(current) ?? []) {
      if (!result.has(child.id)) {
        result.add(child.id);
        stack.push(child.id);
      }
    }
  }

  return result;
}

// Depth-first list of folders with their nesting depth, for a <select> of
// move destinations. Excluded folders are skipped together with their subtree.
export function flattenFolderOptions<F extends TreeFolder & { name: string }>(
  folders: F[],
  excludeIds: Set<string>,
) {
  const childrenMap = buildChildrenMap(folders);
  const result: { id: string; name: string; depth: number }[] = [];

  function walk(parentId: string | null, depth: number) {
    for (const child of childrenMap.get(parentId) ?? []) {
      if (excludeIds.has(child.id)) continue;
      result.push({ id: child.id, name: child.name, depth });
      walk(child.id, depth + 1);
    }
  }

  walk(null, 0);
  return result;
}

// Folders that stay visible while searching for `term`: a folder is shown if
// its own name matches, if a note directly inside it matches by title, or if
// any folder below it does, so a match deep in the tree keeps its whole path
// visible. Returns an empty set for an empty term.
export function getVisibleFolderIds<
  F extends TreeFolder & { name: string },
  T extends { folderId: string | null; title: string },
>(folders: F[], items: T[], term: string) {
  const normalized = term.trim().toLowerCase();
  const visible = new Set<string>();

  if (!normalized) return visible;

  const childrenMap = buildChildrenMap(folders);
  const itemsMap = buildItemsMap(items);

  function check(folder: F): boolean {
    let hasMatch = folder.name.toLowerCase().includes(normalized);

    for (const item of itemsMap.get(folder.id) ?? []) {
      if (item.title.toLowerCase().includes(normalized)) hasMatch = true;
    }

    // Every child is checked (no early exit) so all matching branches are found
    for (const child of childrenMap.get(folder.id) ?? []) {
      if (check(child)) hasMatch = true;
    }

    if (hasMatch) visible.add(folder.id);
    return hasMatch;
  }

  for (const folder of childrenMap.get(null) ?? []) check(folder);

  return visible;
}
