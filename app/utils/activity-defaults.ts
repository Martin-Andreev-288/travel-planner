// Starting values for a new activity, taken from the trip's existing ones, so
// adding several activities in the same place, day by day, is quick

type ActivityLike = { city: string; date?: string };

// The city most activities are in ("" for a trip without activities)
export function mostCommonCity(items: ActivityLike[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.city, (counts.get(item.city) ?? 0) + 1);
  }
  let best = "";
  for (const [city, count] of counts) {
    if (count > (counts.get(best) ?? 0)) best = city;
  }
  return best;
}

// The trip's last day ("" if no activity has a date). YYYY-MM-DD dates sort
// correctly as text.
export function latestDate(items: ActivityLike[]) {
  return items.reduce(
    (latest, item) => (item.date && item.date > latest ? item.date : latest),
    "",
  );
}
