import { latestDate, mostCommonCity } from "./activity-defaults";

describe("mostCommonCity", () => {
  it("returns the city most activities are in", () => {
    expect(
      mostCommonCity([
        { city: "Florence" },
        { city: "Rome" },
        { city: "Rome" },
      ]),
    ).toBe("Rome");
  });

  it("returns the first one on a tie", () => {
    expect(mostCommonCity([{ city: "Rome" }, { city: "Florence" }])).toBe(
      "Rome",
    );
  });

  it("returns an empty string for a trip without activities", () => {
    expect(mostCommonCity([])).toBe("");
  });
});

describe("latestDate", () => {
  it("returns the trip's last day", () => {
    expect(
      latestDate([
        { city: "Rome", date: "2027-05-02" },
        { city: "Rome", date: "2027-05-10" },
        { city: "Rome", date: "2027-05-03" },
      ]),
    ).toBe("2027-05-10");
  });

  it("ignores activities without a date", () => {
    expect(
      latestDate([{ city: "Rome" }, { city: "Rome", date: "2027-05-01" }]),
    ).toBe("2027-05-01");
  });

  it("returns an empty string when no activity has a date", () => {
    expect(latestDate([{ city: "Rome" }])).toBe("");
    expect(latestDate([])).toBe("");
  });
});
