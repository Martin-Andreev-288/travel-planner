// @vitest-environment node
import { POST } from "./route";
import { NextRequest } from "next/server";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/places", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const FAKE_KEY = "test-google-maps-key";

const samplePlace = {
  displayName: { text: "Eiffel Tower" },
  location: { latitude: 48.8584, longitude: 2.2945 },
  formattedAddress: "Champ de Mars, 5 Av. Anatole France, 75007 Paris, France",
};

function mockFetchOk(places: unknown[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ places }),
    }),
  );
}

// ── Setup / teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  process.env.GOOGLE_MAPS_API_KEY = FAKE_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GOOGLE_MAPS_API_KEY;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/places", () => {
  it("returns 400 when query is missing", async () => {
    vi.stubGlobal("fetch", vi.fn());

    const res = await POST(makeRequest({ city: "Paris" }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Query and city are required" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns 400 when city is missing", async () => {
    vi.stubGlobal("fetch", vi.fn());

    const res = await POST(makeRequest({ query: "museums" }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Query and city are required" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns 500 when the Google Maps API key is not configured", async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    vi.stubGlobal("fetch", vi.fn());

    const res = await POST(makeRequest({ query: "museums", city: "Paris" }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Server configuration error" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("calls the Google Places API with the correct URL and headers", async () => {
    mockFetchOk([samplePlace]);

    await POST(makeRequest({ query: "museums", city: "Paris" }));

    expect(fetch).toHaveBeenCalledOnce();
    const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, RequestInit];
    expect(url).toBe("https://places.googleapis.com/v1/places:searchText");
    expect(options.method).toBe("POST");
    expect((options.headers as Record<string, string>)["X-Goog-Api-Key"]).toBe(
      FAKE_KEY,
    );
  });

  it("sends the combined searchQuery in the request body", async () => {
    mockFetchOk([samplePlace]);

    await POST(makeRequest({ query: "museums", city: "Paris" }));

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const sentBody = JSON.parse(options.body as string);
    expect(sentBody.textQuery).toBe("museums in Paris");
  });

  it("returns 200 with name and location on a successful response", async () => {
    mockFetchOk([samplePlace]);

    const res = await POST(
      makeRequest({ query: "Eiffel Tower", city: "Paris" }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      name: "Eiffel Tower",
      location: { lat: 48.8584, lng: 2.2945 },
    });
  });

  it("returns 404 when the API returns no places", async () => {
    mockFetchOk([]);

    const res = await POST(makeRequest({ query: "xyz123", city: "Nowhere" }));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "Place not found" });
  });

  it("returns the upstream error when the Places API responds with an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: "Request contains an invalid argument." },
        }),
      }),
    );

    const res = await POST(makeRequest({ query: "museums", city: "Paris" }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Request contains an invalid argument.");
  });

  it("returns 500 when an unexpected error is thrown", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network failure")),
    );

    const res = await POST(makeRequest({ query: "museums", city: "Paris" }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Internal server error" });
  });
});
