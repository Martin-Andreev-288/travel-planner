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
