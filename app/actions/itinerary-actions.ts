"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatError } from "@/lib/utils";
import {
  itineraryActivitySchema,
  itineraryTitleSchema,
  type ItineraryActivityInput,
} from "@/lib/validations";
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
    city: string;
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

    // Apply the change to the stored item and check the result with the same
    // rules as adding one, so e.g. a new end time is compared with the start
    // time already saved. Only these five fields are written: anything else in
    // `data` (it comes from the client) is ignored.
    const pick = (value: string | null | undefined, stored: string | null) =>
      (value === undefined ? stored : value) ?? undefined;
    const parsed = itineraryActivitySchema.safeParse({
      name: data.name ?? item.name,
      city: data.city ?? item.city,
      date: pick(data.date, item.date),
      startTime: pick(data.startTime, item.startTime),
      endTime: pick(data.endTime, item.endTime),
    });
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0].message };
    }

    const { name, city, date, startTime, endTime } = parsed.data;
    await prisma.itineraryItem.update({
      where: { id },
      data: {
        name,
        city,
        date: date ?? null,
        startTime: startTime ?? null,
        endTime: endTime ?? null,
      },
    });

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

// ── updateItinerary ───────────────────────────────────────────────────────────

export async function updateItinerary(
  id: string,
  items: TravelItineraryItem[],
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

    // The title is left as it is: it may have been chosen by hand (New trip,
    // or renamed on My Itineraries), and updating the items shouldn't undo that
    await prisma.$transaction([
      prisma.itineraryItem.deleteMany({ where: { itineraryId: id } }),
      prisma.itinerary.update({
        where: { id },
        data: {
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
      }),
    ]);

    revalidatePath("/my-itineraries");
    revalidatePath(`/my-itineraries/${id}`);
    return { success: true, message: "Itinerary updated" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// ── createItinerary ───────────────────────────────────────────────────────────

// Creates an empty itinerary for planning a trip by hand; activities are then
// added one by one with addItineraryItem
export async function createItinerary(
  title: string,
): Promise<{ success: boolean; message: string; id?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Not authenticated" };
    }

    const parsed = itineraryTitleSchema.safeParse(title);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0].message };
    }

    const itinerary = await prisma.itinerary.create({
      data: { title: parsed.data, userId: session.user.id },
    });

    revalidatePath("/my-itineraries");
    return { success: true, message: "Itinerary created", id: itinerary.id };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// ── addItineraryItem ──────────────────────────────────────────────────────────

export async function addItineraryItem(
  itineraryId: string,
  input: ItineraryActivityInput,
): Promise<{
  success: boolean;
  message: string;
  item?: TravelItineraryItem;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Not authenticated" };
    }

    const parsed = itineraryActivitySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0].message };
    }

    const itinerary = await prisma.itinerary.findUnique({
      where: { id: itineraryId },
    });

    if (!itinerary) {
      return { success: false, message: "Itinerary not found" };
    }

    if (itinerary.userId !== session.user.id) {
      return { success: false, message: "Not authorised" };
    }

    const { name, city, date, startTime, endTime } = parsed.data;
    const item = await prisma.itineraryItem.create({
      data: {
        itineraryId,
        name,
        city,
        date: date ?? null,
        startTime: startTime ?? null,
        endTime: endTime ?? null,
      },
    });

    revalidatePath("/my-itineraries");
    revalidatePath(`/my-itineraries/${itineraryId}`);
    return {
      success: true,
      message: "Activity added",
      item: {
        id: item.id,
        name: item.name,
        city: item.city,
        date: item.date ?? undefined,
        startTime: item.startTime ?? undefined,
        endTime: item.endTime ?? undefined,
      },
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
