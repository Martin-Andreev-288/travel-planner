import { createToolSet } from "./tool-set";
import { itineraries } from "./itinerary-store";

const SESSION_ID = "test-session";

// Clean the shared store between tests
beforeEach(() => {
  for (const key of Object.keys(itineraries)) {
    delete itineraries[key];
  }
});

// Helper to get the underlying array for assertions
function getItems() {
  return itineraries[SESSION_ID] ?? [];
}

// Minimal options the AI SDK passes to a tool's execute function
function executionOptions(toolCallId: string) {
  return { toolCallId, messages: [], context: {} };
}

describe("createToolSet", () => {
  // ── addItineraryItem ────────────────────────────────────────────────────────

  describe("addItineraryItem", () => {
    it("adds an item to the itinerary", async () => {
      const tools = createToolSet(SESSION_ID);
      await tools.addItineraryItem.execute(
        { id: "1", city: "Paris", name: "Eiffel Tower" },
        executionOptions("call-1"),
      );

      expect(getItems()).toHaveLength(1);
      expect(getItems()[0]).toMatchObject({
        id: "1",
        city: "Paris",
        name: "Eiffel Tower",
      });
    });

    it("adds multiple items", async () => {
      const tools = createToolSet(SESSION_ID);
      await tools.addItineraryItem.execute(
        { id: "1", city: "Paris", name: "Eiffel Tower" },
        executionOptions("call-1"),
      );
      await tools.addItineraryItem.execute(
        { id: "2", city: "Paris", name: "Louvre Museum" },
        executionOptions("call-2"),
      );

      expect(getItems()).toHaveLength(2);
    });

    it("includes optional fields when provided", async () => {
      const tools = createToolSet(SESSION_ID);
      await tools.addItineraryItem.execute(
        {
          id: "1",
          city: "Rome",
          name: "Colosseum",
          date: "2026-05-01",
          startTime: "09:00",
          endTime: "12:00",
        },
        executionOptions("call-1"),
      );

      expect(getItems()[0]).toMatchObject({
        date: "2026-05-01",
        startTime: "09:00",
        endTime: "12:00",
      });
    });

    it("returns the added item", async () => {
      const tools = createToolSet(SESSION_ID);
      const result = await tools.addItineraryItem.execute(
        { id: "1", city: "Paris", name: "Eiffel Tower" },
        executionOptions("call-1"),
      );

      expect(result).toMatchObject({ id: "1", name: "Eiffel Tower" });
    });
  });

  // ── removeItineraryItem ─────────────────────────────────────────────────────

  describe("removeItineraryItem", () => {
    it("removes an existing item by id", async () => {
      const tools = createToolSet(SESSION_ID);
      await tools.addItineraryItem.execute(
        { id: "1", city: "Paris", name: "Eiffel Tower" },
        executionOptions("call-1"),
      );

      await tools.removeItineraryItem.execute(
        { id: "1" },
        executionOptions("call-2"),
      );

      expect(getItems()).toHaveLength(0);
    });

    it("does nothing when id does not exist", async () => {
      const tools = createToolSet(SESSION_ID);
      await tools.addItineraryItem.execute(
        { id: "1", city: "Paris", name: "Eiffel Tower" },
        executionOptions("call-1"),
      );

      await tools.removeItineraryItem.execute(
        { id: "non-existent" },
        executionOptions("call-2"),
      );

      expect(getItems()).toHaveLength(1);
    });

    it("returns the args object", async () => {
      const tools = createToolSet(SESSION_ID);
      const result = await tools.removeItineraryItem.execute(
        { id: "1" },
        executionOptions("call-1"),
      );

      expect(result).toEqual({ id: "1" });
    });
  });

  // ── updateItineraryItem ─────────────────────────────────────────────────────

  describe("updateItineraryItem", () => {
    it("updates the name of an existing item", async () => {
      const tools = createToolSet(SESSION_ID);
      await tools.addItineraryItem.execute(
        { id: "1", city: "Paris", name: "Eiffel Tower" },
        executionOptions("call-1"),
      );

      await tools.updateItineraryItem.execute(
        { id: "1", city: "Paris", name: "Arc de Triomphe" },
        executionOptions("call-2"),
      );

      expect(getItems()[0].name).toBe("Arc de Triomphe");
    });

    it("updates optional fields", async () => {
      const tools = createToolSet(SESSION_ID);
      await tools.addItineraryItem.execute(
        { id: "1", city: "Paris", name: "Eiffel Tower" },
        executionOptions("call-1"),
      );

      await tools.updateItineraryItem.execute(
        { id: "1", city: "Paris", date: "2026-06-15", startTime: "10:00" },
        executionOptions("call-2"),
      );

      expect(getItems()[0]).toMatchObject({
        name: "Eiffel Tower",
        date: "2026-06-15",
        startTime: "10:00",
      });
    });

    it("does nothing when id does not exist", async () => {
      const tools = createToolSet(SESSION_ID);
      await tools.addItineraryItem.execute(
        { id: "1", city: "Paris", name: "Eiffel Tower" },
        executionOptions("call-1"),
      );

      await tools.updateItineraryItem.execute(
        { id: "non-existent", city: "Paris", name: "Ghost" },
        executionOptions("call-2"),
      );

      expect(getItems()).toHaveLength(1);
      expect(getItems()[0].name).toBe("Eiffel Tower");
    });

    it("returns the args object", async () => {
      const tools = createToolSet(SESSION_ID);
      await tools.addItineraryItem.execute(
        { id: "1", city: "Paris", name: "Eiffel Tower" },
        executionOptions("call-1"),
      );

      const result = await tools.updateItineraryItem.execute(
        { id: "1", city: "Paris", name: "Updated" },
        executionOptions("call-2"),
      );

      expect(result).toMatchObject({ id: "1", name: "Updated" });
    });
  });

  // ── setLocation ─────────────────────────────────────────────────────────────

  describe("setLocation", () => {
    it("acknowledges the location", async () => {
      const tools = createToolSet(SESSION_ID);
      const result = await tools.setLocation.execute(
        { name: "Paris" },
        executionOptions("call-1"),
      );

      expect(result).toEqual({ status: "ok" });
    });

    it("does not change the itinerary", async () => {
      const tools = createToolSet(SESSION_ID);
      await tools.setLocation.execute(
        { name: "Paris" },
        executionOptions("call-1"),
      );

      expect(getItems()).toHaveLength(0);
    });
  });
});
