import {
  createNoteFolder,
  deleteNoteFolder,
  getNoteFolderTree,
  moveNoteFolder,
  moveNoteToFolder,
  renameNoteFolder,
  reorderNoteFolders,
} from "./note-folder-actions";

const { auth, prisma, revalidatePath } = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    note: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    noteFolder: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  revalidatePath: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("next/cache", () => ({ revalidatePath }));

const USER_ID = "user-1";

// Folder tree used by the ownership and cycle checks:
// root-a → child-a → grandchild-a, and a separate root-b
const FOLDERS: Record<string, { parentFolderId: string | null }> = {
  "root-a": { parentFolderId: null },
  "child-a": { parentFolderId: "root-a" },
  "grandchild-a": { parentFolderId: "child-a" },
  "root-b": { parentFolderId: null },
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: USER_ID } });
  prisma.noteFolder.findFirst.mockImplementation(
    async ({ where }: { where: { id: string; userId: string } }) => {
      const folder = FOLDERS[where.id];
      if (!folder || where.userId !== USER_ID) return null;
      return { id: where.id, parentFolderId: folder.parentFolderId };
    },
  );
  prisma.noteFolder.aggregate.mockResolvedValue({ _max: { order: 2 } });
  prisma.noteFolder.create.mockResolvedValue({ id: "new-folder" });
});

describe("getNoteFolderTree", () => {
  it("returns empty lists when nobody is signed in", async () => {
    auth.mockResolvedValue(null);
    expect(await getNoteFolderTree()).toEqual({ folders: [], notes: [] });
    expect(prisma.note.findMany).not.toHaveBeenCalled();
  });

  it("returns the user's folders and notes with a short preview instead of the content", async () => {
    const updatedAt = new Date("2026-09-01");
    prisma.noteFolder.findMany.mockResolvedValue([
      { id: "root-a", name: "Berlin", parentFolderId: null, order: 0 },
    ]);
    prisma.note.findMany.mockResolvedValue([
      {
        id: "n1",
        title: "Short",
        content: "Hello",
        folderId: null,
        createdAt: updatedAt,
        updatedAt,
      },
      {
        id: "n2",
        title: "Long",
        content: "x".repeat(200),
        folderId: "root-a",
        createdAt: updatedAt,
        updatedAt,
      },
    ]);

    const tree = await getNoteFolderTree();

    expect(prisma.note.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID } }),
    );
    expect(tree.folders).toHaveLength(1);
    expect(tree.notes[0]).toEqual({
      id: "n1",
      title: "Short",
      folderId: null,
      createdAt: updatedAt,
      updatedAt,
      preview: "Hello",
    });
    expect(tree.notes[1].preview).toBe(`${"x".repeat(140)}…`);
    expect(tree.notes[1]).not.toHaveProperty("content");
  });
});

describe("createNoteFolder", () => {
  it("rejects unauthenticated users", async () => {
    auth.mockResolvedValue(null);
    const result = await createNoteFolder("Berlin");
    expect(result).toEqual({ success: false, message: "Not authenticated" });
  });

  it("rejects an empty name", async () => {
    const result = await createNoteFolder("  ");
    expect(result).toEqual({
      success: false,
      message: "Folder name cannot be empty",
    });
    expect(prisma.noteFolder.create).not.toHaveBeenCalled();
  });

  it("creates a root folder after its existing siblings", async () => {
    const result = await createNoteFolder(" Berlin ");

    expect(prisma.noteFolder.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        name: "Berlin",
        parentFolderId: null,
        order: 3,
      },
    });
    expect(result).toEqual({
      success: true,
      message: "Folder created",
      id: "new-folder",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/notes");
  });

  it("starts the order at 0 in an empty parent", async () => {
    prisma.noteFolder.aggregate.mockResolvedValue({ _max: { order: null } });

    await createNoteFolder("Day trips", "root-a");

    expect(prisma.noteFolder.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ parentFolderId: "root-a", order: 0 }),
    });
  });

  it("rejects a parent folder that doesn't belong to the user", async () => {
    const result = await createNoteFolder("Day trips", "unknown");
    expect(result).toEqual({ success: false, message: "Folder not found" });
    expect(prisma.noteFolder.create).not.toHaveBeenCalled();
  });
});

describe("renameNoteFolder", () => {
  it("renames the user's folder", async () => {
    const result = await renameNoteFolder("root-a", " Paris ");
    expect(prisma.noteFolder.update).toHaveBeenCalledWith({
      where: { id: "root-a" },
      data: { name: "Paris" },
    });
    expect(result).toEqual({ success: true, message: "Folder renamed" });
  });

  it("rejects an empty name", async () => {
    const result = await renameNoteFolder("root-a", "");
    expect(result.success).toBe(false);
    expect(prisma.noteFolder.update).not.toHaveBeenCalled();
  });

  it("rejects a folder that doesn't belong to the user", async () => {
    const result = await renameNoteFolder("unknown", "Paris");
    expect(result).toEqual({ success: false, message: "Folder not found" });
  });
});

describe("deleteNoteFolder", () => {
  it("deletes the user's folder", async () => {
    const result = await deleteNoteFolder("root-a");
    expect(prisma.noteFolder.delete).toHaveBeenCalledWith({
      where: { id: "root-a" },
    });
    expect(result).toEqual({ success: true, message: "Folder deleted" });
  });

  it("rejects a folder that doesn't belong to the user", async () => {
    const result = await deleteNoteFolder("unknown");
    expect(result).toEqual({ success: false, message: "Folder not found" });
    expect(prisma.noteFolder.delete).not.toHaveBeenCalled();
  });
});

describe("moveNoteFolder", () => {
  it("moves a folder into another folder, at the end", async () => {
    const result = await moveNoteFolder("root-b", "child-a");

    expect(prisma.noteFolder.update).toHaveBeenCalledWith({
      where: { id: "root-b" },
      data: { parentFolderId: "child-a", order: 3 },
    });
    expect(result).toEqual({ success: true, message: "Folder moved" });
  });

  it("moves a folder to the top level", async () => {
    const result = await moveNoteFolder("child-a", null);
    expect(result.success).toBe(true);
    expect(prisma.noteFolder.update).toHaveBeenCalledWith({
      where: { id: "child-a" },
      data: { parentFolderId: null, order: 3 },
    });
  });

  it("refuses to move a folder into itself", async () => {
    const result = await moveNoteFolder("root-a", "root-a");
    expect(result.success).toBe(false);
    expect(prisma.noteFolder.update).not.toHaveBeenCalled();
  });

  it("refuses to move a folder into one of its own subfolders", async () => {
    const result = await moveNoteFolder("root-a", "grandchild-a");
    expect(result).toEqual({
      success: false,
      message: "A folder cannot be moved into itself or its subfolders",
    });
    expect(prisma.noteFolder.update).not.toHaveBeenCalled();
  });

  it("rejects a target folder that doesn't belong to the user", async () => {
    const result = await moveNoteFolder("root-a", "unknown");
    expect(result).toEqual({ success: false, message: "Folder not found" });
  });
});

describe("moveNoteToFolder", () => {
  beforeEach(() => {
    prisma.note.findFirst.mockResolvedValue({ id: "note-1" });
  });

  it("moves the note into a folder the user owns", async () => {
    const result = await moveNoteToFolder("note-1", "root-a");
    expect(prisma.note.update).toHaveBeenCalledWith({
      where: { id: "note-1" },
      data: { folderId: "root-a" },
    });
    expect(result).toEqual({ success: true, message: "Note moved" });
  });

  it("moves the note out of any folder", async () => {
    await moveNoteToFolder("note-1", null);
    expect(prisma.note.update).toHaveBeenCalledWith({
      where: { id: "note-1" },
      data: { folderId: null },
    });
  });

  it("rejects a note that doesn't belong to the user", async () => {
    prisma.note.findFirst.mockResolvedValue(null);
    const result = await moveNoteToFolder("note-1", "root-a");
    expect(result).toEqual({ success: false, message: "Note not found" });
    expect(prisma.note.update).not.toHaveBeenCalled();
  });

  it("rejects a folder that doesn't belong to the user", async () => {
    const result = await moveNoteToFolder("note-1", "unknown");
    expect(result).toEqual({ success: false, message: "Folder not found" });
    expect(prisma.note.update).not.toHaveBeenCalled();
  });
});

describe("reorderNoteFolders", () => {
  beforeEach(() => {
    prisma.noteFolder.findMany.mockResolvedValue([
      { id: "root-a" },
      { id: "root-b" },
    ]);
    prisma.noteFolder.update.mockImplementation((args) => args);
  });

  it("saves the new order of sibling folders", async () => {
    const result = await reorderNoteFolders(null, ["root-b", "root-a"]);

    expect(prisma.$transaction).toHaveBeenCalledWith([
      { where: { id: "root-b" }, data: { order: 0 } },
      { where: { id: "root-a" }, data: { order: 1 } },
    ]);
    expect(result).toEqual({ success: true, message: "Folders reordered" });
  });

  it("rejects ids that aren't siblings owned by the user", async () => {
    const result = await reorderNoteFolders(null, ["root-a", "child-a"]);
    expect(result).toEqual({ success: false, message: "Folder not found" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
