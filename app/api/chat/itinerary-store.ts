import { z } from "zod";
import { Place } from "@/app/utils/places";

export type TravelItineraryItem = {
  id: string;
  name: string;
  city: string;
  location?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  place?: Place;
};

export const itineraries: Record<string, TravelItineraryItem[]> = {};

export function getOrCreateItinerary(sessionId: string): TravelItineraryItem[] {
  if (!itineraries[sessionId]) {
    itineraries[sessionId] = [];
  }
  return itineraries[sessionId];
}

// The itinerary as the browser currently shows it, sent with every chat
// message. Only the fields the model works with are kept, and the size is
// capped, since this comes from the client.
export const clientItinerarySchema = z
  .array(
    z.object({
      id: z.string().min(1).max(100),
      name: z.string().max(200),
      city: z.string().max(100),
      location: z.string().max(200).optional(),
      date: z.string().max(20).optional(),
      startTime: z.string().max(10).optional(),
      endTime: z.string().max(10).optional(),
    }),
  )
  .max(200);

// Makes the browser's itinerary the starting point for this chat request.
// The browser is the source of truth: items loaded with Continue Planning,
// edited or deleted by hand in the panel, or cleared with Start over only
// exist there, and the model has to see exactly what the user sees.
export function replaceItinerary(
  sessionId: string,
  items: TravelItineraryItem[],
): TravelItineraryItem[] {
  const itinerary = getOrCreateItinerary(sessionId);
  itinerary.splice(0, itinerary.length, ...items);
  return itinerary;
}
