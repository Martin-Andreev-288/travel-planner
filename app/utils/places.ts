import { TravelItineraryItem } from "@/app/api/chat/itinerary-store";

export type Place = {
  name: string;
  location: { lat: number; lng: number };
};
// TODO: Use zod to share types with the API
const PLACE_CACHE = new Map<string, Place>();

export async function enrichItineraryWithPlace(
  items: TravelItineraryItem[],
): Promise<TravelItineraryItem[]> {
  return Promise.all(
    items.map(async (item) => {
      const place = await fetchPlace(item);
      const newItem = { ...item };
      if (place) newItem.place = place;
      return newItem;
    }),
  );
}

async function fetchPlace(
  item: TravelItineraryItem,
): Promise<Place | undefined> {
  const cacheKey = `${item.city}-${item.name}`;

  if (PLACE_CACHE.has(cacheKey)) {
    return PLACE_CACHE.get(cacheKey);
  }

  try {
    const response = await fetch("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: item.name, city: item.city }),
    });

    if (!response.ok) {
      throw new Error(`Places API failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.location) {
      console.warn(`No coordinates found for ${item.name} in ${item.city}`);
      return;
    }

    const place = { name: data.name, location: data.location };
    PLACE_CACHE.set(cacheKey, place);
    return place;
  } catch (error) {
    console.error("Error fetching place coordinates:", error);
    return;
  }
}
