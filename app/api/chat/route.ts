import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import fs from "fs/promises";
import { getOrCreateItinerary } from "./itinerary-store";
import { createToolSet } from "./tool-set";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const systemMessageTemplate = await fs.readFile(
  `${process.cwd()}/app/api/chat/system.md`,
  { encoding: "utf-8" },
);

export async function POST(req: Request) {
  const { id, messages }: { id: string; messages: Message[] } =
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

  const system = systemMessageTemplate.replace(
    "{{ITINERARY}}",
    JSON.stringify(sortedItinerary, null, 2),
  );
  const result = streamText({
    system,
    model: google("gemini-2.5-flash"),
    messages,
    tools: createToolSet(id),
  });
  return result.toDataStreamResponse();
}
