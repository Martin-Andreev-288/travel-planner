import {
  addItineraryItem,
  createItinerary,
  updateItinerary,
  updateItineraryItem,
} from "./itinerary-actions";

const { auth, prisma, revalidatePath } = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    itinerary: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    itineraryItem: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
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
  prisma.itinerary.create.mockResolvedValue({ id: "trip-1" });
  prisma.itinerary.findUnique.mockResolvedValue({
    id: "trip-1",
    userId: USER_ID,
  });
  prisma.itineraryItem.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => ({
      id: "item-1",
      ...data,
    }),
  );
});

describe("createItinerary", () => {
  it("rejects unauthenticated users", async () => {
    auth.mockResolvedValue(null);
    const result = await createItinerary("Rome");
    expect(result).toEqual({ success: false, message: "Not authenticated" });
    expect(prisma.itinerary.create).not.toHaveBeenCalled();
  });

  it("rejects an empty name", async () => {
    const result = await createItinerary("   ");
    expect(result).toEqual({
      success: false,
      message: "Trip name is required",
    });
    expect(prisma.itinerary.create).not.toHaveBeenCalled();
  });

  it("creates an empty itinerary with the trimmed name for the user", async () => {
    const result = await createItinerary("  Summer in Rome ");

    expect(prisma.itinerary.create).toHaveBeenCalledWith({
      data: { title: "Summer in Rome", userId: USER_ID },
    });
    expect(result).toEqual({
      success: true,
      message: "Itinerary created",
      id: "trip-1",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/my-itineraries");
  });

  it("returns the error message when the database call fails", async () => {
    prisma.itinerary.create.mockRejectedValue(new Error("Connection lost"));
    const result = await createItinerary("Rome");
    expect(result).toEqual({ success: false, message: "Connection lost" });
  });
});

describe("addItineraryItem", () => {
  const activity = {
    name: " Museum Island ",
    city: "Berlin",
    date: "2027-02-01",
    startTime: "09:00",
    endTime: "11:30",
  };

  it("rejects unauthenticated users", async () => {
    auth.mockResolvedValue(null);
    const result = await addItineraryItem("trip-1", activity);
    expect(result).toEqual({ success: false, message: "Not authenticated" });
    expect(prisma.itineraryItem.create).not.toHaveBeenCalled();
  });

  it("rejects invalid input before touching the database", async () => {
    const result = await addItineraryItem("trip-1", {
      ...activity,
      endTime: "08:00",
    });
    expect(result).toEqual({
      success: false,
      message: "End time must be after the start time",
    });
    expect(prisma.itinerary.findUnique).not.toHaveBeenCalled();
  });

  it("rejects an itinerary that doesn't exist", async () => {
    prisma.itinerary.findUnique.mockResolvedValue(null);
    const result = await addItineraryItem("missing", activity);
    expect(result).toEqual({ success: false, message: "Itinerary not found" });
    expect(prisma.itineraryItem.create).not.toHaveBeenCalled();
  });

  it("rejects another user's itinerary", async () => {
    prisma.itinerary.findUnique.mockResolvedValue({
      id: "trip-1",
      userId: "someone-else",
    });
    const result = await addItineraryItem("trip-1", activity);
    expect(result).toEqual({ success: false, message: "Not authorised" });
    expect(prisma.itineraryItem.create).not.toHaveBeenCalled();
  });

  it("adds the activity and returns it with its new id", async () => {
    const result = await addItineraryItem("trip-1", activity);

    expect(prisma.itineraryItem.create).toHaveBeenCalledWith({
      data: {
        itineraryId: "trip-1",
        name: "Museum Island",
        city: "Berlin",
        date: "2027-02-01",
        startTime: "09:00",
        endTime: "11:30",
      },
    });
    expect(result).toEqual({
      success: true,
      message: "Activity added",
      item: {
        id: "item-1",
        name: "Museum Island",
        city: "Berlin",
        date: "2027-02-01",
        startTime: "09:00",
        endTime: "11:30",
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/my-itineraries");
    expect(revalidatePath).toHaveBeenCalledWith("/my-itineraries/trip-1");
  });

  it("stores missing date and times as empty", async () => {
    const result = await addItineraryItem("trip-1", {
      name: "Walk",
      city: "Berlin",
    });

    expect(prisma.itineraryItem.create).toHaveBeenCalledWith({
      data: {
        itineraryId: "trip-1",
        name: "Walk",
        city: "Berlin",
        date: null,
        startTime: null,
        endTime: null,
      },
    });
    expect(result.item).toEqual({
      id: "item-1",
      name: "Walk",
      city: "Berlin",
      date: undefined,
      startTime: undefined,
      endTime: undefined,
    });
  });
});

describe("updateItinerary", () => {
  it("replaces the activities but keeps the trip's name", async () => {
    const result = await updateItinerary("trip-1", [
      { id: "x", name: "Pantheon", city: "Rome" },
    ]);

    expect(result).toEqual({ success: true, message: "Itinerary updated" });
    expect(prisma.itinerary.update).toHaveBeenCalledOnce();
    const [{ data }] = prisma.itinerary.update.mock.calls[0];
    expect(data).not.toHaveProperty("title");
    expect(data.items.create).toEqual([
      {
        name: "Pantheon",
        city: "Rome",
        location: null,
        date: null,
        startTime: null,
        endTime: null,
      },
    ]);
  });
});

describe("updateItineraryItem", () => {
  const stored = {
    id: "item-1",
    name: "Colosseum",
    city: "Rome",
    date: "2027-05-01",
    startTime: "09:00",
    endTime: "11:00",
    itinerary: { id: "trip-1", userId: USER_ID },
  };

  beforeEach(() => {
    prisma.itineraryItem.findUnique.mockResolvedValue(stored);
  });

  it("rejects another user's activity", async () => {
    prisma.itineraryItem.findUnique.mockResolvedValue({
      ...stored,
      itinerary: { id: "trip-1", userId: "someone-else" },
    });
    const result = await updateItineraryItem("item-1", { name: "X" });
    expect(result).toEqual({ success: false, message: "Not authorised" });
    expect(prisma.itineraryItem.update).not.toHaveBeenCalled();
  });

  it("changes the city, keeping everything else as stored", async () => {
    const result = await updateItineraryItem("item-1", { city: " Florence " });

    expect(result).toEqual({ success: true });
    expect(prisma.itineraryItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: {
        name: "Colosseum",
        city: "Florence",
        date: "2027-05-01",
        startTime: "09:00",
        endTime: "11:00",
      },
    });
  });

  it("checks a new end time against the stored start time", async () => {
    const result = await updateItineraryItem("item-1", { endTime: "08:00" });
    expect(result).toEqual({
      success: false,
      message: "End time must be after the start time",
    });
    expect(prisma.itineraryItem.update).not.toHaveBeenCalled();
  });

  it("rejects an empty name or city", async () => {
    expect((await updateItineraryItem("item-1", { name: "  " })).message).toBe(
      "Activity name is required",
    );
    expect((await updateItineraryItem("item-1", { city: "" })).message).toBe(
      "City is required",
    );
  });

  it("clears the date and times when they are set to null", async () => {
    await updateItineraryItem("item-1", {
      date: null,
      startTime: null,
      endTime: null,
    });
    expect(prisma.itineraryItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: {
        name: "Colosseum",
        city: "Rome",
        date: null,
        startTime: null,
        endTime: null,
      },
    });
  });

  it("ignores fields other than the activity's own", async () => {
    // A hand-crafted request could try to move the activity to another trip
    await updateItineraryItem("item-1", {
      name: "Colosseum",
      itineraryId: "someone-elses-trip",
    } as never);

    const [{ data }] = prisma.itineraryItem.update.mock.calls[0];
    expect(data).not.toHaveProperty("itineraryId");
  });
});
