import { itineraries } from "./itinerary-store";
import { POST } from "./route";

// The model call is replaced: these tests check what the route gives the
// model, not what the model answers
const { streamText } = vi.hoisted(() => ({
  streamText: vi.fn(() => ({
    stream: new ReadableStream({ start: (controller) => controller.close() }),
  })),
}));

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  streamText,
}));
vi.mock("@ai-sdk/google", () => ({ google: vi.fn(() => "test-model") }));

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(itineraries)) delete itineraries[key];
});

const userMessage = {
  id: "m1",
  role: "user",
  parts: [{ type: "text", text: "Remove the Colosseum visit" }],
};

function chatRequest(body: object) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify({ id: "chat-1", messages: [userMessage], ...body }),
  });
}

// The system instructions the route passed to the model
const instructions = () =>
  (streamText.mock.calls[0] as unknown as [{ instructions: string }])[0]
    .instructions;

describe("POST /api/chat", () => {
  it("gives the model the itinerary the browser sent, with its ids", async () => {
    const res = await POST(
      chatRequest({
        itinerary: [
          { id: "cmx-db-1", name: "Visit the Colosseum", city: "Rome" },
        ],
      }),
    );

    expect(res.status).toBe(200);
    expect(instructions()).toContain('"id": "cmx-db-1"');
    expect(instructions()).toContain("Visit the Colosseum");
    expect(itineraries["chat-1"]).toEqual([
      { id: "cmx-db-1", name: "Visit the Colosseum", city: "Rome" },
    ]);
  });

  it("replaces an outdated itinerary from earlier messages", async () => {
    itineraries["chat-1"] = [
      { id: "old", name: "Deleted in the panel", city: "Rome" },
    ];

    await POST(chatRequest({ itinerary: [] }));

    expect(itineraries["chat-1"]).toEqual([]);
    expect(instructions()).not.toContain("Deleted in the panel");
  });

  it("keeps the stored itinerary when the browser doesn't send one", async () => {
    itineraries["chat-1"] = [{ id: "kept", name: "Pantheon", city: "Rome" }];

    await POST(chatRequest({}));

    expect(instructions()).toContain("Pantheon");
  });

  it("rejects a malformed itinerary without calling the model", async () => {
    const res = await POST(chatRequest({ itinerary: [{ name: "No id" }] }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid itinerary" });
    expect(streamText).not.toHaveBeenCalled();
  });
});
