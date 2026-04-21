import type { fetchAndDrawDayRoutes as FetchFn } from "./routes";

// ---------- helpers ----------

const STUB_GEOMETRY: GeoJSON.Geometry = {
  type: "LineString",
  coordinates: [
    [0, 0],
    [1, 1],
  ],
};

function makeFetchMock(geometry: GeoJSON.Geometry = STUB_GEOMETRY) {
  return vi.fn().mockResolvedValue({
    json: vi.fn().mockResolvedValue({ routes: [{ geometry }] }),
  });
}

function makeMapMock() {
  return {
    getLayer: vi.fn().mockReturnValue(undefined),
    removeLayer: vi.fn(),
    getSource: vi.fn().mockReturnValue(undefined),
    removeSource: vi.fn(),
    addSource: vi.fn(),
    addLayer: vi.fn(),
  };
}

function marker(lng: number, lat: number, date?: string) {
  return { id: `${lng}:${lat}`, name: "Place", date, location: { lng, lat } };
}

// ---------- tests ----------

describe("fetchAndDrawDayRoutes", () => {
  let fetchAndDrawDayRoutes: typeof FetchFn;

  beforeEach(async () => {
    // vi.resetModules clears the module-level routeGeometryCache between tests
    vi.resetModules();
    ({ fetchAndDrawDayRoutes } = await import("./routes"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not fetch when markersByDay is empty", async () => {
    const fetchMock = makeFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    await fetchAndDrawDayRoutes([], makeMapMock() as any, []);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not fetch when a day has only one marker", async () => {
    const fetchMock = makeFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    await fetchAndDrawDayRoutes([[marker(1, 2)]], makeMapMock() as any, []);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls the OSRM walking API with the correct coordinates URL", async () => {
    const fetchMock = makeFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const map = makeMapMock();
    const markers = [marker(2.35, 48.85), marker(2.29, 48.87)];

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    await fetchAndDrawDayRoutes([markers], map as any, []);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());

    const url: string = fetchMock.mock.calls[0][0];
    expect(url).toContain("router.project-osrm.org/route/v1/walking/");
    expect(url).toContain("2.35,48.85;2.29,48.87");
    expect(url).toContain("geometries=geojson");
  });

  it("adds a source and layer to the map with the correct day IDs", async () => {
    vi.stubGlobal("fetch", makeFetchMock());
    const map = makeMapMock();
    const markers = [marker(10, 20), marker(30, 40)];

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    await fetchAndDrawDayRoutes([markers], map as any, []);
    await vi.waitFor(() => expect(map.addSource).toHaveBeenCalled());

    expect(map.addSource).toHaveBeenCalledWith(
      "route-day-0",
      expect.objectContaining({ type: "geojson" }),
    );
    expect(map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "route-layer-0", type: "line" }),
    );
  });

  it("records the coordinate string in drawnRoutes synchronously after starting a draw", async () => {
    vi.stubGlobal("fetch", makeFetchMock());
    const markers = [marker(1.1, 2.2), marker(3.3, 4.4)];
    const drawnRoutes: string[] = [];

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    await fetchAndDrawDayRoutes([markers], makeMapMock() as any, drawnRoutes);

    // drawnRoutes is updated synchronously (before the async fetch settles)
    expect(drawnRoutes[0]).toBe("1.1,2.2;3.3,4.4");
  });

  it("skips drawing when drawnRoutes already contains the matching coordinate string", async () => {
    const fetchMock = makeFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const map = makeMapMock();
    const markers = [marker(5, 6), marker(7, 8)];
    // Pre-populate drawnRoutes so the entry already matches
    const drawnRoutes = ["5,6;7,8"];

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    await fetchAndDrawDayRoutes([markers], map as any, drawnRoutes);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(map.addSource).not.toHaveBeenCalled();
  });

  it("fetches the route only once when the same coordinates appear in two separate calls (geometry cache)", async () => {
    const fetchMock = makeFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const markers = [marker(11, 22), marker(33, 44)];

    // First call — fetches and caches the geometry; drawnRoutes[0] is set
    const drawnRoutes: string[] = [];
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    await fetchAndDrawDayRoutes([markers], makeMapMock() as any, drawnRoutes);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());

    // Second call with a fresh drawnRoutes (simulates a remount) — cache should prevent re-fetch
    const map2 = makeMapMock();
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    await fetchAndDrawDayRoutes([markers], map2 as any, []);
    await vi.waitFor(() => expect(map2.addSource).toHaveBeenCalled());

    expect(fetchMock).toHaveBeenCalledOnce(); // still only one fetch
  });

  it("removes an existing map route when a day drops below 2 markers", async () => {
    vi.stubGlobal("fetch", makeFetchMock());
    const map = makeMapMock();
    map.getLayer.mockReturnValue({}); // simulate an existing layer
    map.getSource.mockReturnValue({}); // simulate an existing source

    // drawnRoutes[0] is pre-set as if a route was previously drawn for day 0
    const drawnRoutes = ["0,0;1,1"];

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    await fetchAndDrawDayRoutes([[marker(0, 0)]], map as any, drawnRoutes);

    expect(map.removeLayer).toHaveBeenCalledWith("route-layer-0");
    expect(map.removeSource).toHaveBeenCalledWith("route-day-0");
    expect(drawnRoutes[0]).toBeUndefined();
  });
});
