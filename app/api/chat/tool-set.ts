import { InferUITools, StaticToolCall, tool, UIDataTypes, UIMessage } from "ai";
import { z } from "zod";
import { getOrCreateItinerary, TravelItineraryItem } from "./itinerary-store";

type ItineraryToolSet = ReturnType<typeof createToolSet>;

export type ItineraryToolCall = StaticToolCall<ItineraryToolSet>;
export type ItineraryUIMessage = UIMessage<
  never,
  UIDataTypes,
  InferUITools<ItineraryToolSet>
>;

const nameSchema = z.string().describe("Name of the itinerary item");
const dateSchema = z
  .string()
  .describe(
    "The date of the itinerary item in YYYY-MM-DD format. You should convert the date provided by the user to this format.",
  );
const timeSchema = z
  .string()
  .describe(
    "The time of the itinerary item in HH:MM format. You should convert the time provided by the user to this format.",
  );

export function createToolSet(sessionId: string) {
  return {
    addItineraryItem: tool({
      description: "adds an item to the travel itinerary",
      inputSchema: z.object({
        id: z.string(),
        city: z.string(),
        name: nameSchema,
        date: dateSchema.optional(),
        startTime: timeSchema.optional(),
        endTime: timeSchema.optional(),
      }),
      execute: async (params) => addItineraryItem(params),
    }),
    removeItineraryItem: tool({
      description: "removes an item from the travel itinerary",
      inputSchema: z.object({ id: z.string() }),
      execute: async (params) => removeItineraryItem(params),
    }),
    updateItineraryItem: tool({
      description: "updates an item in the travel itinerary",
      inputSchema: z.object({
        id: z.string(),
        city: z.string(),
        name: nameSchema.optional(),
        date: dateSchema.optional(),
        startTime: timeSchema.optional(),
        endTime: timeSchema.optional(),
      }),
      execute: async (params) => updateItineraryItem(params),
    }),
    setLocation: tool({
      description: "the location that the user wants to visit",
      inputSchema: z.object({
        name: z.string(),
      }),
      // The map zoom happens on the client; the server only acknowledges it
      execute: async () => ({ status: "ok" }),
    }),
  };

  function addItineraryItem(item: TravelItineraryItem) {
    const itineraryPlan = getOrCreateItinerary(sessionId);
    itineraryPlan.push(item);
    return item;
  }

  function removeItineraryItem(args: { id: string }) {
    const itineraryPlan = getOrCreateItinerary(sessionId);
    const index = itineraryPlan.findIndex((item) => item.id === args.id);
    if (index !== -1) {
      itineraryPlan.splice(index, 1);
    }
    return args;
  }

  function updateItineraryItem(
    args: Partial<TravelItineraryItem> & { id: string },
  ) {
    const itineraryPlan = getOrCreateItinerary(sessionId);
    const index = itineraryPlan.findIndex((item) => item.id === args.id);
    if (index !== -1) {
      itineraryPlan[index] = { ...itineraryPlan[index], ...args };
    }
    return args;
  }
}
