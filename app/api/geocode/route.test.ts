// @vitest-environment node
import { POST } from "./route";
import { NextRequest } from "next/server";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/geocode", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const FAKE_KEY = "test-google-maps-key";

/** Build the fetch mock value that the handler expects on success. */
function mockFetchOk(results: unknown[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results }),
    }),
  );
}

const sampleResult = {
  geometry: {
    viewport: { northeast: { lat: 1, lng: 2 }, southwest: { lat: 3, lng: 4 } },
    location: { lat: 0.5, lng: 1 },
  },
};

// ── Setup / teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  process.env.GOOGLE_MAPS_API_KEY = FAKE_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GOOGLE_MAPS_API_KEY;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/geocode", () => {
  it("returns 400 when cityName is missing", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "City name is required" });
  });

  it("returns 500 when the Google Maps API key is not configured", async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    vi.stubGlobal("fetch", vi.fn());

    const res = await POST(makeRequest({ cityName: "Paris" }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Server configuration error" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("calls the Google Maps Geocoding API with the correct URL", async () => {
    mockFetchOk([]);

    await POST(makeRequest({ cityName: "New York" }));

    expect(fetch).toHaveBeenCalledOnce();
    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(calledUrl).toContain("maps.googleapis.com/maps/api/geocode/json");
    expect(calledUrl).toContain(encodeURIComponent("New York"));
    expect(calledUrl).toContain(`key=${FAKE_KEY}`);
  });

  it("returns mapped geometries on a successful response", async () => {
    mockFetchOk([sampleResult]);

    const res = await POST(makeRequest({ cityName: "Tokyo" }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      geometries: [
        {
          viewport: sampleResult.geometry.viewport,
          location: sampleResult.geometry.location,
        },
      ],
    });
  });

  it("returns an empty geometries array when the API returns no results", async () => {
    mockFetchOk([]);

    const res = await POST(makeRequest({ cityName: "UnknownPlace" }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ geometries: [] });
  });

  it("returns the upstream status code when the Geocoding API responds with an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        text: async () => "API key invalid",
      }),
    );

    const res = await POST(makeRequest({ cityName: "Berlin" }));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/Forbidden/i);
  });

  it("returns 500 when an unexpected error is thrown", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network failure")),
    );

    const res = await POST(makeRequest({ cityName: "Madrid" }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Internal server error" });
  });
});
