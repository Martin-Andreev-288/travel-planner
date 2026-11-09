"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatError } from "@/lib/utils";
import { revalidatePath } from "next/cache";

const NOTES_PATH = "/notes";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

// Finds a title this user isn't already using, adding "(2)", "(3)" the way a
// file manager does, so two notes created as "Packing list" stay distinguishable.
// Only applied on create: a title the user deliberately renames to is kept as is.
async function availableTitle(userId: string, title: string): Promise<string> {
  // `startsWith` also returns e.g. "Packing lists", which is harmless: the
  // result is only used for exact lookups below
  const taken = new Set(
    (
      await prisma.note.findMany({
        where: { userId, title: { startsWith: title } },
        select: { title: true },
      })
    ).map((note) => note.title),
  );

  if (!taken.has(title)) return title;

  // With `taken.size` titles in the way, one of these suffixes must be free
  for (let suffix = 2; suffix <= taken.size + 2; suffix += 1) {
    const candidate = `${title} (${suffix})`;
    if (!taken.has(candidate)) return candidate;
  }

  return title;
}

// ── createNote ────────────────────────────────────────────────────────────────

export async function createNote(
  title: string,
  content: string,
  folderId?: string | null,
): Promise<{ success: boolean; message: string; id?: string }> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, message: "Not authenticated" };
    }

    const trimmed = title.trim();
    if (!trimmed) {
      return { success: false, message: "Title cannot be empty" };
    }

    if (folderId) {
      const folder = await prisma.noteFolder.findFirst({
        where: { id: folderId, userId },
      });
      if (!folder) {
        return { success: false, message: "Folder not found" };
      }
    }

    const note = await prisma.note.create({
      data: {
        userId,
        title: await availableTitle(userId, trimmed),
        content,
        folderId: folderId ?? null,
      },
    });

    revalidatePath(NOTES_PATH);
    return { success: true, message: "Note created", id: note.id };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// ── getNote ───────────────────────────────────────────────────────────────────

// The notes list only carries a short preview, so the full content is loaded
// when a note is opened for editing
export async function getNote(id: string): Promise<{
  success: boolean;
  message?: string;
  note?: { id: string; title: string; content: string };
}> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, message: "Not authenticated" };
    }

    const note = await prisma.note.findFirst({
      where: { id, userId },
      select: { id: true, title: true, content: true },
    });

    if (!note) {
      return { success: false, message: "Note not found" };
    }

    return { success: true, note };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// ── updateNote ────────────────────────────────────────────────────────────────

export async function updateNote(
  id: string,
  data: Partial<{ title: string; content: string }>,
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, message: "Not authenticated" };
    }

    const title = data.title?.trim();
    if (data.title !== undefined && !title) {
      return { success: false, message: "Title cannot be empty" };
    }

    const note = await prisma.note.findFirst({ where: { id, userId } });
    if (!note) {
      return { success: false, message: "Note not found" };
    }

    await prisma.note.update({
      where: { id },
      data: { title, content: data.content },
    });

    revalidatePath(NOTES_PATH);
    return { success: true, message: "Note updated" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// ── deleteNote ────────────────────────────────────────────────────────────────

export async function deleteNote(
  id: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, message: "Not authenticated" };
    }

    const note = await prisma.note.findFirst({ where: { id, userId } });
    if (!note) {
      return { success: false, message: "Note not found" };
    }

    await prisma.note.delete({ where: { id } });

    revalidatePath(NOTES_PATH);
    return { success: true, message: "Note deleted" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
