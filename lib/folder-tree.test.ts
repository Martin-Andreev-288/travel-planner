import {
  buildChildrenMap,
  buildItemsMap,
  flattenFolderOptions,
  getDescendantFolderIds,
  getVisibleFolderIds,
} from "./folder-tree";

// europe → germany → berlin, europe → france, and a separate asia
const folders = [
  { id: "europe", name: "Europe", parentFolderId: null },
  { id: "germany", name: "Germany", parentFolderId: "europe" },
  { id: "berlin", name: "Berlin", parentFolderId: "germany" },
  { id: "france", name: "France", parentFolderId: "europe" },
  { id: "asia", name: "Asia", parentFolderId: null },
];

describe("buildChildrenMap", () => {
  it("groups folders by their parent, keeping their order", () => {
    const map = buildChildrenMap(folders);
    expect(map.get(null)?.map((f) => f.id)).toEqual(["europe", "asia"]);
    expect(map.get("europe")?.map((f) => f.id)).toEqual(["germany", "france"]);
    expect(map.get("germany")?.map((f) => f.id)).toEqual(["berlin"]);
  });

  it("has no entry for folders without children", () => {
    expect(buildChildrenMap(folders).has("berlin")).toBe(false);
  });

  it("returns an empty map for no folders", () => {
    expect(buildChildrenMap([]).size).toBe(0);
  });
});

describe("buildItemsMap", () => {
  it("groups items by folder, with top-level items under null", () => {
    const map = buildItemsMap([
      { id: "a", folderId: null },
      { id: "b", folderId: "berlin" },
      { id: "c", folderId: "berlin" },
    ]);
    expect(map.get(null)?.map((n) => n.id)).toEqual(["a"]);
    expect(map.get("berlin")?.map((n) => n.id)).toEqual(["b", "c"]);
  });
});

describe("getDescendantFolderIds", () => {
  it("returns every folder below the given one, at any depth", () => {
    expect(getDescendantFolderIds(folders, "europe")).toEqual(
      new Set(["germany", "berlin", "france"]),
    );
  });

  it("does not include the folder itself", () => {
    expect(getDescendantFolderIds(folders, "europe").has("europe")).toBe(false);
  });

  it("returns an empty set for a folder without subfolders", () => {
    expect(getDescendantFolderIds(folders, "berlin").size).toBe(0);
  });
});

describe("flattenFolderOptions", () => {
  it("lists folders depth-first with their nesting depth", () => {
    expect(flattenFolderOptions(folders, new Set())).toEqual([
      { id: "europe", name: "Europe", depth: 0 },
      { id: "germany", name: "Germany", depth: 1 },
      { id: "berlin", name: "Berlin", depth: 2 },
      { id: "france", name: "France", depth: 1 },
      { id: "asia", name: "Asia", depth: 0 },
    ]);
  });

  it("skips excluded folders together with their subfolders", () => {
    const options = flattenFolderOptions(folders, new Set(["germany"]));
    expect(options.map((o) => o.id)).toEqual(["europe", "france", "asia"]);
  });
});

describe("getVisibleFolderIds", () => {
  const items = [
    { folderId: "berlin", title: "Museum Island" },
    { folderId: "france", title: "Louvre tickets" },
    { folderId: null, title: "Packing list" },
  ];

  it("returns nothing for an empty or blank term", () => {
    expect(getVisibleFolderIds(folders, items, "").size).toBe(0);
    expect(getVisibleFolderIds(folders, items, "   ").size).toBe(0);
  });

  it("keeps the whole path to a note that matches deep in the tree", () => {
    expect(getVisibleFolderIds(folders, items, "museum")).toEqual(
      new Set(["berlin", "germany", "europe"]),
    );
  });

  it("includes folders whose own name matches, with their ancestors", () => {
    expect(getVisibleFolderIds(folders, items, "GERMANY")).toEqual(
      new Set(["germany", "europe"]),
    );
  });

  it("finds matches in several branches at once", () => {
    expect(getVisibleFolderIds(folders, items, "a")).toEqual(
      new Set(["europe", "germany", "berlin", "france", "asia"]),
    );
  });

  it("ignores top-level notes, which don't belong to any folder", () => {
    expect(getVisibleFolderIds(folders, items, "packing").size).toBe(0);
  });
});
