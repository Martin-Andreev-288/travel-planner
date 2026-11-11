import { DEFAULT_DIRECTION, directionLabel, sortNotes } from "./note-sorting";

const notes = [
  {
    title: "day 10",
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-20T10:00:00.000Z",
  },
  {
    title: "Day 2",
    createdAt: "2026-09-03T10:00:00.000Z",
    updatedAt: "2026-09-05T10:00:00.000Z",
  },
  {
    title: "Berlin",
    createdAt: "2026-09-02T10:00:00.000Z",
    updatedAt: "2026-09-25T10:00:00.000Z",
  },
];

const titles = (list: typeof notes) => list.map((note) => note.title);

describe("sortNotes", () => {
  it("sorts by title A → Z, ignoring case and comparing numbers naturally", () => {
    expect(titles(sortNotes(notes, "title", "asc"))).toEqual([
      "Berlin",
      "Day 2",
      "day 10",
    ]);
  });

  it("sorts by title Z → A", () => {
    expect(titles(sortNotes(notes, "title", "desc"))).toEqual([
      "day 10",
      "Day 2",
      "Berlin",
    ]);
  });

  it("sorts by last update, newest first", () => {
    expect(titles(sortNotes(notes, "updatedAt", "desc"))).toEqual([
      "Berlin",
      "day 10",
      "Day 2",
    ]);
  });

  it("sorts by creation date, oldest first", () => {
    expect(titles(sortNotes(notes, "createdAt", "asc"))).toEqual([
      "day 10",
      "Berlin",
      "Day 2",
    ]);
  });

  it("does not change the original array", () => {
    const original = [...notes];
    sortNotes(notes, "title", "asc");
    expect(notes).toEqual(original);
  });
});

describe("DEFAULT_DIRECTION", () => {
  it("starts dates newest first and titles A → Z", () => {
    expect(DEFAULT_DIRECTION).toEqual({
      updatedAt: "desc",
      createdAt: "desc",
      title: "asc",
    });
  });
});

describe("directionLabel", () => {
  it("describes the order in words", () => {
    expect(directionLabel("title", "asc")).toBe("A → Z");
    expect(directionLabel("title", "desc")).toBe("Z → A");
    expect(directionLabel("updatedAt", "desc")).toBe("Newest first");
    expect(directionLabel("createdAt", "asc")).toBe("Oldest first");
  });
});
