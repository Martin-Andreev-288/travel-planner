import { getOrCreateItinerary, itineraries } from "./itinerary-store";

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
