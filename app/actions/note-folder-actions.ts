"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatError } from "@/lib/utils";
import { revalidatePath } from "next/cache";

const NOTES_PATH = "/notes";
const PREVIEW_LENGTH = 140;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

async function isOwnedFolder(userId: string, folderId: string) {
  const folder = await prisma.noteFolder.findFirst({
    where: { id: folderId, userId },
    select: { id: true },
  });
  return !!folder;
}

// Walks up the parent chain from `startFolderId`; reaching `folderId` means
// the move would put a folder inside its own subtree and create a cycle
async function isDescendantOrSelf(
  userId: string,
  folderId: string,
  startFolderId: string,
) {
  let cursor: string | null = startFolderId;

  while (cursor) {
    if (cursor === folderId) return true;

    const parent: { parentFolderId: string | null } | null =
      await prisma.noteFolder.findFirst({
        where: { id: cursor, userId },
        select: { parentFolderId: true },
      });

    cursor = parent?.parentFolderId ?? null;
  }

  return false;
}

async function nextFolderOrder(userId: string, parentFolderId: string | null) {
  const max = await prisma.noteFolder.aggregate({
    where: { userId, parentFolderId },
    _max: { order: true },
  });
  return (max._max.order ?? -1) + 1;
}

// ── getNoteFolderTree ─────────────────────────────────────────────────────────

// Returns every folder as a flat list (folders can be nested to any depth, so
// the tree is assembled on the client) and every note with a short preview
// instead of its full content
export async function getNoteFolderTree() {
  const userId = await getUserId();
  if (!userId) {
    return { folders: [], notes: [] };
  }

  const [folders, notes] = await Promise.all([
    prisma.noteFolder.findMany({
      where: { userId },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, parentFolderId: true, order: true },
    }),
    prisma.note.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        folderId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return {
    folders,
    notes: notes.map(({ content, ...note }) => ({
      ...note,
      preview:
        content.length > PREVIEW_LENGTH
          ? `${content.slice(0, PREVIEW_LENGTH)}…`
          : content,
    })),
  };
}

// ── createNoteFolder ──────────────────────────────────────────────────────────

export async function createNoteFolder(
  name: string,
  parentFolderId?: string | null,
): Promise<{ success: boolean; message: string; id?: string }> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, message: "Not authenticated" };
    }

    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, message: "Folder name cannot be empty" };
    }

    if (parentFolderId && !(await isOwnedFolder(userId, parentFolderId))) {
      return { success: false, message: "Folder not found" };
    }

    const folder = await prisma.noteFolder.create({
      data: {
        userId,
        name: trimmed,
        parentFolderId: parentFolderId ?? null,
        order: await nextFolderOrder(userId, parentFolderId ?? null),
      },
    });

    revalidatePath(NOTES_PATH);
    return { success: true, message: "Folder created", id: folder.id };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// ── renameNoteFolder ──────────────────────────────────────────────────────────

export async function renameNoteFolder(
  id: string,
  name: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, message: "Not authenticated" };
    }

    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, message: "Folder name cannot be empty" };
    }

    if (!(await isOwnedFolder(userId, id))) {
      return { success: false, message: "Folder not found" };
    }

    await prisma.noteFolder.update({ where: { id }, data: { name: trimmed } });

    revalidatePath(NOTES_PATH);
    return { success: true, message: "Folder renamed" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// ── deleteNoteFolder ──────────────────────────────────────────────────────────

export async function deleteNoteFolder(
  id: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, message: "Not authenticated" };
    }

    if (!(await isOwnedFolder(userId, id))) {
      return { success: false, message: "Folder not found" };
    }

    // Subfolders and every note inside them are deleted via onDelete: Cascade
    await prisma.noteFolder.delete({ where: { id } });

    revalidatePath(NOTES_PATH);
    return { success: true, message: "Folder deleted" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// ── moveNoteFolder ────────────────────────────────────────────────────────────

export async function moveNoteFolder(
  id: string,
  newParentFolderId: string | null,
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, message: "Not authenticated" };
    }

    if (!(await isOwnedFolder(userId, id))) {
      return { success: false, message: "Folder not found" };
    }

    if (newParentFolderId) {
      if (!(await isOwnedFolder(userId, newParentFolderId))) {
        return { success: false, message: "Folder not found" };
      }
      if (await isDescendantOrSelf(userId, id, newParentFolderId)) {
        return {
          success: false,
          message: "A folder cannot be moved into itself or its subfolders",
        };
      }
    }

    await prisma.noteFolder.update({
      where: { id },
      data: {
        parentFolderId: newParentFolderId,
        order: await nextFolderOrder(userId, newParentFolderId),
      },
    });

    revalidatePath(NOTES_PATH);
    return { success: true, message: "Folder moved" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// ── moveNoteToFolder ──────────────────────────────────────────────────────────

export async function moveNoteToFolder(
  noteId: string,
  folderId: string | null,
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, message: "Not authenticated" };
    }

    const note = await prisma.note.findFirst({
      where: { id: noteId, userId },
      select: { id: true },
    });
    if (!note) {
      return { success: false, message: "Note not found" };
    }

    if (folderId && !(await isOwnedFolder(userId, folderId))) {
      return { success: false, message: "Folder not found" };
    }

    await prisma.note.update({ where: { id: noteId }, data: { folderId } });

    revalidatePath(NOTES_PATH);
    return { success: true, message: "Note moved" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// ── reorderNoteFolders ────────────────────────────────────────────────────────

export async function reorderNoteFolders(
  parentFolderId: string | null,
  orderedIds: string[],
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, message: "Not authenticated" };
    }

    const siblings = await prisma.noteFolder.findMany({
      where: { userId, parentFolderId },
      select: { id: true },
    });
    const siblingIds = new Set(siblings.map((folder) => folder.id));

    if (orderedIds.some((id) => !siblingIds.has(id))) {
      return { success: false, message: "Folder not found" };
    }

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.noteFolder.update({ where: { id }, data: { order: index } }),
      ),
    );

    revalidatePath(NOTES_PATH);
    return { success: true, message: "Folders reordered" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
