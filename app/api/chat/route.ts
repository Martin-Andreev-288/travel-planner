import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
} from "ai";
import { google } from "@ai-sdk/google";
import fs from "fs/promises";
import { getOrCreateItinerary } from "./itinerary-store";
import { createToolSet, ItineraryUIMessage } from "./tool-set";

// Upper bound for the model -> tool -> model loop of a single request
const MAX_STEPS = 10;

const systemMessageTemplate = await fs.readFile(
  `${process.cwd()}/app/api/chat/system.md`,
  { encoding: "utf-8" },
);

export async function POST(req: Request) {
  const { id, messages }: { id: string; messages: ItineraryUIMessage[] } =
    await req.json();
  const itineraryPlan = getOrCreateItinerary(id);

  // Sort itinerary items by date and then by time
  const sortedItinerary = [...itineraryPlan].sort((a, b) => {
    // Sort by date first
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1; // Items without date go at the end
    if (!b.date) return -1;

    const dateComparison =
      new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateComparison !== 0) return dateComparison;

    // If dates are the same, sort by start time
    if (!a.startTime && !b.startTime) return 0;
    if (!a.startTime) return 1; // Items without start time go at the end
    if (!b.startTime) return -1;

    return a.startTime.localeCompare(b.startTime);
  });

  const instructions = systemMessageTemplate.replace(
    "{{ITINERARY}}",
    JSON.stringify(sortedItinerary, null, 2),
  );
  const tools = createToolSet(id);
  const result = streamText({
    instructions,
    model: google("gemini-3.5-flash-lite"),
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    stopWhen: isStepCount(MAX_STEPS),
    onError: ({ error }) => console.error("[chat] streamText error:", error),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      tools,
      onError: (error) =>
        error instanceof Error ? error.message : "Something went wrong.",
    }),
  });
}
