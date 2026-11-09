import { createNote, deleteNote, getNote, updateNote } from "./note-actions";

const { auth, prisma, revalidatePath } = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    note: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    noteFolder: {
      findFirst: vi.fn(),
    },
  },
  revalidatePath: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("next/cache", () => ({ revalidatePath }));

const USER_ID = "user-1";

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: USER_ID } });
  prisma.note.findMany.mockResolvedValue([]);
  prisma.note.create.mockResolvedValue({ id: "note-1" });
});

describe("createNote", () => {
  it("rejects unauthenticated users", async () => {
    auth.mockResolvedValue(null);
    const result = await createNote("Packing list", "");
    expect(result).toEqual({ success: false, message: "Not authenticated" });
    expect(prisma.note.create).not.toHaveBeenCalled();
  });

  it("rejects an empty title", async () => {
    const result = await createNote("   ", "content");
    expect(result).toEqual({
      success: false,
      message: "Title cannot be empty",
    });
    expect(prisma.note.create).not.toHaveBeenCalled();
  });

  it("creates the note with a trimmed title for the current user", async () => {
    const result = await createNote("  Packing list  ", "Passport");

    expect(prisma.note.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        title: "Packing list",
        content: "Passport",
        folderId: null,
      },
    });
    expect(result).toEqual({
      success: true,
      message: "Note created",
      id: "note-1",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/notes");
  });

  it("numbers the title when the user already has a note with it", async () => {
    prisma.note.findMany.mockResolvedValue([
      { title: "Packing list" },
      { title: "Packing list (2)" },
      { title: "Packing lists" },
    ]);

    await createNote("Packing list", "");

    expect(prisma.note.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ title: "Packing list (3)" }),
    });
  });

  it("only looks for duplicate titles among the current user's notes", async () => {
    await createNote("Packing list", "");

    expect(prisma.note.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, title: { startsWith: "Packing list" } },
      select: { title: true },
    });
  });

  it("creates the note inside a folder the user owns", async () => {
    prisma.noteFolder.findFirst.mockResolvedValue({ id: "folder-1" });

    await createNote("Ideas", "", "folder-1");

    expect(prisma.noteFolder.findFirst).toHaveBeenCalledWith({
      where: { id: "folder-1", userId: USER_ID },
    });
    expect(prisma.note.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ folderId: "folder-1" }),
    });
  });

  it("rejects a folder that doesn't belong to the user", async () => {
    prisma.noteFolder.findFirst.mockResolvedValue(null);

    const result = await createNote("Ideas", "", "someone-elses-folder");

    expect(result).toEqual({ success: false, message: "Folder not found" });
    expect(prisma.note.create).not.toHaveBeenCalled();
  });

  it("returns the error message when the database call fails", async () => {
    prisma.note.create.mockRejectedValue(new Error("Connection lost"));

    const result = await createNote("Ideas", "");

    expect(result).toEqual({ success: false, message: "Connection lost" });
  });
});

describe("getNote", () => {
  it("rejects unauthenticated users", async () => {
    auth.mockResolvedValue(null);
    const result = await getNote("note-1");
    expect(result).toEqual({ success: false, message: "Not authenticated" });
  });

  it("returns the full note when it belongs to the user", async () => {
    const note = { id: "note-1", title: "Ideas", content: "Full content" };
    prisma.note.findFirst.mockResolvedValue(note);

    const result = await getNote("note-1");

    expect(prisma.note.findFirst).toHaveBeenCalledWith({
      where: { id: "note-1", userId: USER_ID },
      select: { id: true, title: true, content: true },
    });
    expect(result).toEqual({ success: true, note });
  });

  it("returns 'Note not found' for another user's note", async () => {
    prisma.note.findFirst.mockResolvedValue(null);
    const result = await getNote("note-1");
    expect(result).toEqual({ success: false, message: "Note not found" });
  });
});

describe("updateNote", () => {
  beforeEach(() => {
    prisma.note.findFirst.mockResolvedValue({ id: "note-1" });
  });

  it("rejects unauthenticated users", async () => {
    auth.mockResolvedValue(null);
    const result = await updateNote("note-1", { title: "New" });
    expect(result).toEqual({ success: false, message: "Not authenticated" });
    expect(prisma.note.update).not.toHaveBeenCalled();
  });

  it("rejects an empty title", async () => {
    const result = await updateNote("note-1", { title: "  " });
    expect(result).toEqual({
      success: false,
      message: "Title cannot be empty",
    });
    expect(prisma.note.update).not.toHaveBeenCalled();
  });

  it("rejects a note that doesn't belong to the user", async () => {
    prisma.note.findFirst.mockResolvedValue(null);

    const result = await updateNote("note-1", { content: "x" });

    expect(prisma.note.findFirst).toHaveBeenCalledWith({
      where: { id: "note-1", userId: USER_ID },
    });
    expect(result).toEqual({ success: false, message: "Note not found" });
    expect(prisma.note.update).not.toHaveBeenCalled();
  });

  it("updates the trimmed title and the content", async () => {
    const result = await updateNote("note-1", {
      title: " Berlin ",
      content: "Museum Island",
    });

    expect(prisma.note.update).toHaveBeenCalledWith({
      where: { id: "note-1" },
      data: { title: "Berlin", content: "Museum Island" },
    });
    expect(result).toEqual({ success: true, message: "Note updated" });
    expect(revalidatePath).toHaveBeenCalledWith("/notes");
  });

  it("keeps a title the user chose even if another note already has it", async () => {
    await updateNote("note-1", { title: "Packing list" });

    expect(prisma.note.findMany).not.toHaveBeenCalled();
    expect(prisma.note.update).toHaveBeenCalledWith({
      where: { id: "note-1" },
      data: { title: "Packing list", content: undefined },
    });
  });

  it("allows clearing the content", async () => {
    const result = await updateNote("note-1", { content: "" });
    expect(result.success).toBe(true);
    expect(prisma.note.update).toHaveBeenCalledWith({
      where: { id: "note-1" },
      data: { title: undefined, content: "" },
    });
  });
});

describe("deleteNote", () => {
  it("rejects unauthenticated users", async () => {
    auth.mockResolvedValue(null);
    const result = await deleteNote("note-1");
    expect(result).toEqual({ success: false, message: "Not authenticated" });
    expect(prisma.note.delete).not.toHaveBeenCalled();
  });

  it("rejects a note that doesn't belong to the user", async () => {
    prisma.note.findFirst.mockResolvedValue(null);
    const result = await deleteNote("note-1");
    expect(result).toEqual({ success: false, message: "Note not found" });
    expect(prisma.note.delete).not.toHaveBeenCalled();
  });

  it("deletes the user's note", async () => {
    prisma.note.findFirst.mockResolvedValue({ id: "note-1" });

    const result = await deleteNote("note-1");

    expect(prisma.note.delete).toHaveBeenCalledWith({
      where: { id: "note-1" },
    });
    expect(result).toEqual({ success: true, message: "Note deleted" });
    expect(revalidatePath).toHaveBeenCalledWith("/notes");
  });
});
