import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import Home from "./home";
import { PIN_SIZE } from "../components/map/PinMarker";

// The map, the chat connection and the place/route lookups are replaced:
// these tests are about what Home shows, not about MapLibre or the AI
vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}));
vi.mock("react-map-gl/maplibre", () => ({
  default: React.forwardRef(function Map(
    { children }: { children?: React.ReactNode },
    _ref,
  ) {
    return <div>{children}</div>;
  }),
  Marker: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="pin">{children}</div>
  ),
  // Shows the label together with the settings Home gives it
  Popup: ({
    children,
    anchor,
    offset,
    className,
  }: {
    children?: React.ReactNode;
    anchor?: string;
    offset?: number;
    className?: string;
  }) => (
    <div
      role="tooltip"
      data-anchor={anchor}
      data-offset={offset}
      className={className}
    >
      {children}
    </div>
  ),
}));
const { setMessages } = vi.hoisted(() => ({ setMessages: vi.fn() }));
vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    messages: [],
    setMessages,
    sendMessage: vi.fn(),
    regenerate: vi.fn(),
    status: "ready",
    error: undefined,
  }),
}));
// Every activity gets a map position, so its pin is shown
vi.mock("../utils/places", () => ({
  enrichItineraryWithPlace: async (items: { name: string }[]) =>
    items.map((item, index) => ({
      ...item,
      place: { name: item.name, location: { lat: 48.85 + index, lng: 2.35 } },
    })),
}));
vi.mock("../utils/routes", () => ({ fetchAndDrawDayRoutes: vi.fn() }));
vi.mock("../actions/itinerary-actions", () => ({
  saveItinerary: vi.fn(),
  updateItinerary: vi.fn(),
}));

const fetchMock = vi.fn(
  async (_url: string, _init?: RequestInit) =>
    new Response(JSON.stringify({ geometries: [] }), { status: 200 }),
);

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

const STORAGE_KEY = "guest_itinerary";
const session = { user: { id: "u1", name: "J" }, expires: "2099-01-01" };

type Item = { id: string; name: string; city: string; date: string };
const stockholm: Item[] = [
  {
    id: "s1",
    name: "Explore Gamla Stan",
    city: "Stockholm",
    date: "2027-02-01",
  },
];
const dobrich: Item[] = [
  {
    id: "d1",
    name: "Visit the Dobrich zoo",
    city: "Dobrich",
    date: "2026-10-04",
  },
];
const paris: Item[] = [
  { id: "p1", name: "Eiffel Tower", city: "Paris", date: "2027-02-01" },
  { id: "p2", name: "Seine River Cruise", city: "Paris", date: "2027-02-01" },
];
const ALL = [...stockholm, ...dobrich, ...paris].map((item) => item.name);

// A guest trip left in the browser from before signing in
const storeGuestTrip = (items: Item[]) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
const storedTrip = () =>
  JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Item[] | null;

// The address Continue Planning opens for a saved trip
function openWithContinuePlanning(itineraryId: string, items: Item[]) {
  const trip = {
    itineraryId,
    toolCalls: items.map((args) => ({ toolName: "addItineraryItem", args })),
  };
  window.history.replaceState(
    null,
    "",
    `/#${encodeURIComponent(JSON.stringify(trip))}`,
  );
}

async function renderHome(
  homeSession: typeof session | null = session,
  { strict = false } = {},
) {
  const home = <Home session={homeSession as never} />;
  await act(async () => {
    render(strict ? <React.StrictMode>{home}</React.StrictMode> : home);
  });
}

// Activity names currently shown in the itinerary panel
const panel = () => ALL.filter((name) => screen.queryByText(name));

// Cities the map was asked to move to
const mapMoves = () =>
  fetchMock.mock.calls
    .filter(([url]) => url === "/api/geocode")
    .map(([, init]) => JSON.parse(String(init?.body)).cityName);

describe("Home — which trip it shows when it opens", () => {
  it("never mixes trips: the sequence from Question 97", async () => {
    // As a guest: Stockholm planned, not saved. Then signed in.
    storeGuestTrip(stockholm);

    openWithContinuePlanning("dobrich-trip", dobrich);
    await renderHome();
    expect(panel()).toEqual(["Visit the Dobrich zoo"]);
    cleanup();

    openWithContinuePlanning("paris-trip", paris);
    await renderHome();
    expect(panel()).toEqual(["Eiffel Tower", "Seine River Cruise"]);
  });

  it("moves the map only once, to the trip that was opened", async () => {
    storeGuestTrip(stockholm);
    openWithContinuePlanning("paris-trip", paris);
    await renderHome();
    expect(mapMoves()).toEqual(["Paris"]);
  });

  it("welcomes the user back with the opened trip", async () => {
    openWithContinuePlanning("paris-trip", paris);
    await renderHome();
    const [[messages]] = setMessages.mock.calls;
    const welcome = messages[1].parts[0].text;
    expect(welcome).toContain("Eiffel Tower");
    expect(welcome).toContain("Seine River Cruise");
  });

  it("keeps the guest trip when another trip is opened, and shows it on the next visit", async () => {
    storeGuestTrip(stockholm);
    openWithContinuePlanning("paris-trip", paris);
    await renderHome();
    expect(storedTrip()).toEqual(stockholm);
    cleanup();

    // Opening Home normally
    await renderHome();
    expect(panel()).toEqual(["Explore Gamla Stan"]);
  });

  it("restores the guest trip once after signing in, then forgets it", async () => {
    storeGuestTrip(stockholm);
    await renderHome();
    expect(panel()).toEqual(["Explore Gamla Stan"]);
    expect(storedTrip()).toBeNull();
    cleanup();

    await renderHome();
    expect(panel()).toEqual([]);
  });

  it("doesn't keep a signed-in user's trip in the browser", async () => {
    openWithContinuePlanning("paris-trip", paris);
    await renderHome();
    expect(panel()).toEqual(["Eiffel Tower", "Seine River Cruise"]);
    expect(storedTrip()).toBeNull();
  });

  it("keeps a guest's trip in the browser, so it survives signing in", async () => {
    openWithContinuePlanning("guest", paris);
    await renderHome(null);
    expect(storedTrip()).toEqual(paris);
  });

  it("opens the trip, not the guest trip, when React starts effects twice in development", async () => {
    storeGuestTrip(stockholm);
    openWithContinuePlanning("paris-trip", paris);
    await renderHome(session, { strict: true });
    expect(panel()).toEqual(["Eiffel Tower", "Seine River Cruise"]);
    expect(storedTrip()).toEqual(stockholm);
  });
});

describe("Home — map pins", () => {
  it("shows a pin's name above the pin, where it can't cover it", async () => {
    openWithContinuePlanning("paris-trip", paris);
    await renderHome();
    const pin = (await screen.findAllByTestId("pin"))[0].querySelector(
      "svg",
    ) as SVGElement;

    await userEvent.hover(pin);
    const label = screen.getByRole("tooltip");
    expect(label).toHaveTextContent(/Eiffel Tower|Seine River Cruise/);
    // Raised by more than the pin's height above the point the pin stands on
    expect(label).toHaveAttribute("data-anchor", "bottom");
    expect(Number(label.dataset.offset)).toBeGreaterThan(PIN_SIZE);
    // Ignores the mouse (see .pin-label in globals.css)
    expect(label).toHaveClass("pin-label");

    await userEvent.unhover(pin);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
