"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatError } from "@/lib/utils";
import { TravelItineraryItem } from "@/app/api/chat/itinerary-store";
import { revalidatePath } from "next/cache";

// ── Title generation ─────────────────────────────────────────────────────────

function generateTitle(items: TravelItineraryItem[]): string {
  if (!items.length) return "Untitled Trip";
  return `${items[0].city} Trip`;
}

// ── saveItinerary ─────────────────────────────────────────────────────────────

export async function saveItinerary(
  items: TravelItineraryItem[],
): Promise<{ success: boolean; message: string; id?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Sign in to save your itinerary" };
    }

    if (!items.length) {
      return { success: false, message: "No items to save" };
    }

    const title = generateTitle(items);

    const itinerary = await prisma.itinerary.create({
      data: {
        title,
        userId: session.user.id,
        items: {
          create: items.map((item) => ({
            name: item.name,
            city: item.city,
            location: item.location ?? null,
            date: item.date ?? null,
            startTime: item.startTime ?? null,
            endTime: item.endTime ?? null,
          })),
        },
      },
    });

    revalidatePath("/my-itineraries");
    return { success: true, message: "Itinerary saved", id: itinerary.id };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// ── deleteItinerary ───────────────────────────────────────────────────────────

export async function deleteItinerary(
  id: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Not authenticated" };
    }

    const itinerary = await prisma.itinerary.findUnique({ where: { id } });

    if (!itinerary) {
      return { success: false, message: "Itinerary not found" };
    }

    if (itinerary.userId !== session.user.id) {
      return { success: false, message: "Not authorised" };
    }

    // ItineraryItem rows are deleted automatically via onDelete: Cascade
    await prisma.itinerary.delete({ where: { id } });

    revalidatePath("/my-itineraries");
    return { success: true, message: "Itinerary deleted" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// ── renameItinerary ───────────────────────────────────────────────────────────

export async function renameItinerary(
  id: string,
  title: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Not authenticated" };
    }

    const trimmed = title.trim();
    if (!trimmed) {
      return { success: false, message: "Title cannot be empty" };
    }

    const itinerary = await prisma.itinerary.findUnique({ where: { id } });

    if (!itinerary) {
      return { success: false, message: "Itinerary not found" };
    }

    if (itinerary.userId !== session.user.id) {
      return { success: false, message: "Not authorised" };
    }

    await prisma.itinerary.update({
      where: { id },
      data: { title: trimmed },
    });

    revalidatePath("/my-itineraries");
    return { success: true, message: "Itinerary renamed" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// ── updateItineraryItem ───────────────────────────────────────────────────────

export async function updateItineraryItem(
  id: string,
  data: Partial<{
    name: string;
    date: string | null;
    startTime: string | null;
    endTime: string | null;
  }>,
): Promise<{ success: boolean; message?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Not authenticated" };
    }

    const item = await prisma.itineraryItem.findUnique({
      where: { id },
      include: { itinerary: { select: { userId: true, id: true } } },
    });

    if (!item) {
      return { success: false, message: "Item not found" };
    }

    if (item.itinerary.userId !== session.user.id) {
      return { success: false, message: "Not authorised" };
    }

    await prisma.itineraryItem.update({ where: { id }, data });

    revalidatePath(`/my-itineraries/${item.itinerary.id}`);
    return { success: true };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// ── deleteItineraryItem ───────────────────────────────────────────────────────

export async function deleteItineraryItem(
  id: string,
): Promise<{ success: boolean; message?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Not authenticated" };
    }

    const item = await prisma.itineraryItem.findUnique({
      where: { id },
      include: { itinerary: { select: { userId: true, id: true } } },
    });

    if (!item) {
      return { success: false, message: "Item not found" };
    }

    if (item.itinerary.userId !== session.user.id) {
      return { success: false, message: "Not authorised" };
    }

    await prisma.itineraryItem.delete({ where: { id } });

    revalidatePath(`/my-itineraries/${item.itinerary.id}`);
    return { success: true };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
