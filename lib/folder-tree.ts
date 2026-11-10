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
