import { groupMarkersByDay, Marker } from "./markers";

const marker = (
  id: string,
  date: string | undefined,
  name = "Place",
): Marker => ({
  id,
  date,
  name,
  location: { lng: 0, lat: 0 },
});

describe("groupMarkersByDay", () => {
  it("returns an empty array when given no markers", () => {
    expect(groupMarkersByDay([])).toEqual([]);
  });

  it("groups markers with the same date into one array", () => {
    const markers = [marker("1", "2026-04-01"), marker("2", "2026-04-01")];
    const result = groupMarkersByDay(markers);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(2);
    expect(result[0].map((m) => m.id)).toEqual(["1", "2"]);
  });

  it("creates separate arrays for different dates", () => {
    const markers = [marker("1", "2026-04-01"), marker("2", "2026-04-02")];
    const result = groupMarkersByDay(markers);
    expect(result).toHaveLength(2);
    expect(result[0][0].id).toBe("1");
    expect(result[1][0].id).toBe("2");
  });

  it("sorts days chronologically", () => {
    const markers = [
      marker("1", "2026-04-03"),
      marker("2", "2026-04-01"),
      marker("3", "2026-04-02"),
    ];
    const result = groupMarkersByDay(markers);
    expect(result).toHaveLength(3);
    expect(result[0][0].id).toBe("2"); // Apr 1
    expect(result[1][0].id).toBe("3"); // Apr 2
    expect(result[2][0].id).toBe("1"); // Apr 3
  });

  it("places unscheduled markers (undefined date) last", () => {
    const markers = [marker("1", undefined), marker("2", "2026-04-01")];
    const result = groupMarkersByDay(markers);
    expect(result).toHaveLength(2);
    expect(result[0][0].id).toBe("2"); // dated first
    expect(result[1][0].id).toBe("1"); // unscheduled last
  });

  it("groups multiple unscheduled markers together", () => {
    const markers = [
      marker("1", undefined),
      marker("2", undefined),
      marker("3", "2026-04-01"),
    ];
    const result = groupMarkersByDay(markers);
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveLength(1); // one dated group
    expect(result[1]).toHaveLength(2); // both unscheduled together
  });

  it("handles only unscheduled markers", () => {
    const markers = [marker("1", undefined), marker("2", undefined)];
    const result = groupMarkersByDay(markers);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(2);
  });
});
