import {
  clientItinerarySchema,
  getOrCreateItinerary,
  itineraries,
  replaceItinerary,
} from "./itinerary-store";

// Clean up the shared store between tests
beforeEach(() => {
  for (const key of Object.keys(itineraries)) {
    delete itineraries[key];
  }
});

describe("getOrCreateItinerary", () => {
  it("creates an empty array for a new session ID", () => {
    const result = getOrCreateItinerary("session-1");
    expect(result).toEqual([]);
  });

  it("returns the same reference on subsequent calls with the same ID", () => {
    const first = getOrCreateItinerary("session-1");
    const second = getOrCreateItinerary("session-1");
    expect(first).toBe(second);
  });

  it("returns different arrays for different session IDs", () => {
    const a = getOrCreateItinerary("session-a");
    const b = getOrCreateItinerary("session-b");
    expect(a).not.toBe(b);
  });

  it("persists items pushed to the returned array", () => {
    const itinerary = getOrCreateItinerary("session-1");
    itinerary.push({
      id: "1",
      name: "Eiffel Tower",
      city: "Paris",
    });

    const retrieved = getOrCreateItinerary("session-1");
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].name).toBe("Eiffel Tower");
  });

  it("stores the array in the itineraries record", () => {
    getOrCreateItinerary("session-x");
    expect(itineraries["session-x"]).toBeDefined();
    expect(itineraries["session-x"]).toEqual([]);
  });
});

describe("clientItinerarySchema", () => {
  const item = {
    id: "cmx1",
    name: "Colosseum",
    city: "Rome",
    date: "2027-05-01",
    startTime: "09:00",
    endTime: "11:00",
  };

  it("accepts the items the browser sends", () => {
    expect(clientItinerarySchema.safeParse([item]).success).toBe(true);
    expect(clientItinerarySchema.safeParse([]).success).toBe(true);
  });

  it("keeps only the fields the model works with", () => {
    const result = clientItinerarySchema.safeParse([
      { ...item, place: { name: "x" }, extra: true },
    ]);
    expect(result.success && result.data[0]).toEqual(item);
  });

  it("rejects items without an id, name or city", () => {
    expect(clientItinerarySchema.safeParse([{ ...item, id: "" }]).success).toBe(
      false,
    );
    const { city: _city, ...withoutCity } = item;
    expect(clientItinerarySchema.safeParse([withoutCity]).success).toBe(false);
  });

  it("rejects anything that isn't a list, and lists over 200 items", () => {
    expect(clientItinerarySchema.safeParse("items").success).toBe(false);
    expect(clientItinerarySchema.safeParse(Array(201).fill(item)).success).toBe(
      false,
    );
  });
});

describe("replaceItinerary", () => {
  const rome = { id: "a", name: "Colosseum", city: "Rome" };
  const florence = { id: "b", name: "Uffizi", city: "Florence" };

  it("replaces whatever the session had before", () => {
    getOrCreateItinerary("session-1").push(rome);
    const result = replaceItinerary("session-1", [florence]);
    expect(result).toEqual([florence]);
    expect(getOrCreateItinerary("session-1")).toEqual([florence]);
  });

  it("keeps the same array, so earlier references see the new items", () => {
    const before = getOrCreateItinerary("session-1");
    replaceItinerary("session-1", [rome]);
    expect(before).toEqual([rome]);
  });

  it("clears the itinerary with an empty list", () => {
    getOrCreateItinerary("session-1").push(rome);
    replaceItinerary("session-1", []);
    expect(getOrCreateItinerary("session-1")).toEqual([]);
  });

  it("creates the itinerary for a new session", () => {
    expect(replaceItinerary("new-session", [rome])).toEqual([rome]);
  });
});
