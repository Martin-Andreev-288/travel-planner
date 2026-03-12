export type Marker = {
  date: string | undefined;
  id: string;
  name: string;
  location: {
    lng: number;
    lat: number;
  };
};

// Helper function to group items by day
export const groupMarkersByDay = (markers: Marker[]) => {
  const grouped = markers.reduce<Record<string, Marker[]>>((groups, item) => {
    const date = item.date || "Unscheduled";
    groups[date] = groups[date] || [];
    groups[date].push(item);
    return groups;
  }, {});

  // Sort days chronologically
  const sortedDates = Object.keys(grouped).sort((a, b) => {
    if (a === "Unscheduled") return 1;
    if (b === "Unscheduled") return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  // Create marker arrays for each day
  return sortedDates.map((date) => grouped[date]);
};
