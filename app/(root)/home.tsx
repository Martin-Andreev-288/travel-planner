"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TravelItineraryItem } from "../api/chat/itinerary-store";
import { ItineraryToolCall, ItineraryUIMessage } from "../api/chat/tool-set";
import ItineraryDisplay from "../components/itinerary";
import Chat from "../components/chat";
import WelcomeCard from "../components/welcome-card";
import Map, { MapRef, ViewState } from "react-map-gl/maplibre";
import { Popup } from "react-map-gl/maplibre";
import WebMercatorViewport from "viewport-mercator-project";
import "maplibre-gl/dist/maplibre-gl.css";
import { DefaultChatTransport } from "ai";
import PinMarker from "../components/map/PinMarker";
import { enrichItineraryWithPlace } from "../utils/places";
import { groupMarkersByDay, type Marker } from "../utils/markers";
import { fetchAndDrawDayRoutes } from "../utils/routes";
import type { Session } from "next-auth";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

const STORAGE_KEY = "guest_itinerary";

const chatTransport = new DefaultChatTransport<ItineraryUIMessage>({
  api: "/api/chat",
});

// Shape of the tool calls encoded in the URL hash (see itinerary-detail.tsx)
type HashToolCall = { toolName: string; args: unknown };

function textMessage(
  id: string,
  role: "user" | "assistant",
  text: string,
): ItineraryUIMessage {
  return { id, role, parts: [{ type: "text", text }] };
}

export default function Home({ session }: { session: Session | null }) {
  const [itineraryItems, setItineraryItems] = useState<TravelItineraryItem[]>(
    [],
  );
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [background, setBackground] = useState<"static" | "map">("static");
  const [viewState, setViewState] = useState<Partial<ViewState>>({});
  const [markersByDay, setMarkersByDay] = useState<Marker[][]>([]);
  const [hoveredMarker, setHoveredMarker] = useState<Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [chatVisible, setChatVisible] = useState(true);
  const [itineraryVisible, setItineraryVisible] = useState(true);
  const [currentItineraryId, setCurrentItineraryId] = useState<string | null>(
    null,
  );
  const [input, setInput] = useState("");
  const mapRef = useRef<MapRef>(null);

  // Tools are executed on the server; the client mirrors each call in the UI
  const { messages, setMessages, sendMessage, regenerate, status, error } =
    useChat<ItineraryUIMessage>({
      transport: chatTransport,
      onToolCall: ({ toolCall }) => handleToolCall(toolCall),
    });

  // Restore guest itinerary from localStorage after sign-in
  useEffect(() => {
    if (!session) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const items: TravelItineraryItem[] = JSON.parse(stored);
      if (items.length > 0) {
        setItineraryItems(items);
        setHasStartedChat(true);
        setBackground("map");
        const city = items[0].city;
        if (city) zoomToCity(city);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Persist itinerary to localStorage for guests
  useEffect(() => {
    if (itineraryItems.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(itineraryItems));
    }
  }, [itineraryItems]);

  useEffect(() => {
    // Development feature that enables calling arbitrary tools via URL hash
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) return;
      setHasStartedChat(true);
      setBackground("map");
      const decodedHash = decodeURIComponent(hash);
      const parsed = JSON.parse(decodedHash);

      let toolCalls: HashToolCall[];
      if (Array.isArray(parsed)) {
        toolCalls = parsed;
      } else {
        toolCalls = parsed.toolCalls;
        if (parsed.itineraryId) {
          setCurrentItineraryId(parsed.itineraryId);
        }
      }

      const loadedItems: TravelItineraryItem[] = [];
      for (const { toolName, args } of toolCalls) {
        handleToolCall({ toolName, input: args });
        if (toolName === "addItineraryItem") {
          loadedItems.push(args as TravelItineraryItem);
        }
      }

      // Zoom the map to the itinerary's city
      if (loadedItems.length > 0) {
        const city = loadedItems[0].city;
        zoomToCity(city);
        const itemSummary = loadedItems
          .map((item) => {
            const time =
              item.startTime && item.endTime
                ? ` (${item.startTime}–${item.endTime})`
                : item.startTime
                  ? ` (${item.startTime})`
                  : "";
            const date = item.date ? ` [${item.date}]` : "";
            return `- ${item.name}${time}${date}`;
          })
          .join("\n");

        setMessages([
          textMessage(
            "continue-user",
            "user",
            `I have an existing ${city} itinerary I'd like to continue working on.`,
          ),
          textMessage(
            "continue-assistant",
            "assistant",
            `Welcome back! Here's your current itinerary:\n\n${itemSummary}\n\nWhat changes would you like to make?`,
          ),
        ]);
      }

      window.history.replaceState(null, "", window.location.pathname);
    };
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!itineraryItems.length) {
      setMarkersByDay([]);
      return;
    }

    const fetchCoordinates = async () => {
      const enrichedItems = await enrichItineraryWithPlace(itineraryItems);

      const markers = enrichedItems
        .filter((item) => item.place)
        .map((item) => ({
          id: item.id,
          name: item.place!.name,
          location: item.place!.location,
          date: item.date,
        }));

      // Group markers by day
      const markersByDay = groupMarkersByDay(markers);
      setMarkersByDay(markersByDay);
    };
    fetchCoordinates();
  }, [itineraryItems]);

  const drawnRoutesRef = useRef<string[]>([]);

  useEffect(() => {
    if (!mapRef.current || markersByDay.length === 0 || !mapLoaded) return;
    const map = mapRef.current.getMap();
    fetchAndDrawDayRoutes(markersByDay, map, drawnRoutesRef.current);
  }, [markersByDay, mapLoaded]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    return () => {
      map.remove();
    };
  }, []);

  const botActivity = status === "submitted" || status === "streaming";

  // Every chat request carries the itinerary exactly as the panel shows it,
  // so the AI also knows about items loaded with Continue Planning, edited or
  // deleted by hand, or cleared with Start over
  const chatRequestBody = () => ({
    itinerary: itineraryItems.map(
      ({ id, name, city, location, date, startTime, endTime }) => ({
        id,
        name,
        city,
        location,
        date,
        startTime,
        endTime,
      }),
    ),
  });

  const submitMessage = () => {
    if (!input.trim()) return;
    sendMessage({ text: input }, { body: chatRequestBody() });
    setInput("");
  };

  const retryMessage = () => regenerate({ body: chatRequestBody() });

  const handleStartChat = () => {
    if (input.trim()) {
      setHasStartedChat(true);
      if (messages.length === 0) {
        setMessages([
          textMessage(
            "initial-prompt",
            "assistant",
            "Hello! Where would you like to travel?",
          ),
        ]);
      }
      submitMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleStartOver = () => {
    setItineraryItems([]);
    setHasStartedChat(false);
    setBackground("static");
    setMessages([]);
    setChatVisible(true);
    setItineraryVisible(true);
    setCurrentItineraryId(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Group itinerary items by date
  const groupedItems = itineraryItems.reduce<
    Record<string, TravelItineraryItem[]>
  >((groups, item) => {
    const date = item.date
      ? new Date(item.date).toLocaleDateString(undefined, {
          dateStyle: "medium",
        })
      : "Unscheduled";
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(item);
    return groups;
  }, {});

  // Sort items in each group by start time
  Object.keys(groupedItems).forEach((date) => {
    groupedItems[date].sort((a, b) => {
      // For missing times, place at the end
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      // Otherwise, simple string comparison works for HH:mm format
      return (a.startTime || "").localeCompare(b.startTime || "");
    });
  });

  return (
    <motion.div
      layout
      className="relative h-[calc(100vh-64px)] w-screen overflow-y-auto lg:overflow-hidden"
    >
      <div className="absolute h-full w-full">
        <motion.div
          key="map"
          initial={{ opacity: 0 }} // Start hidden if showMap is initially false
          animate={{ opacity: background === "map" ? 1 : 0 }}
          transition={{ duration: 0.5 }}
          className={`absolute h-full w-full ${background === "map" ? "pointer-events-auto" : "pointer-events-none"}`}
        >
          <Map
            ref={mapRef}
            initialViewState={{ longitude: 8.4, latitude: 49.01, zoom: 14 }}
            {...viewState}
            onLoad={() => setMapLoaded(true)}
            onMove={(evt) => setViewState(evt.viewState)}
            mapStyle="dataviz.json"
          >
            {markersByDay.flat().map((marker) => (
              <PinMarker
                key={marker.id}
                longitude={marker.location.lng}
                latitude={marker.location.lat}
                onMouseEnter={() => setHoveredMarker(marker)}
                onMouseLeave={() => setHoveredMarker(null)}
              />
            ))}

            {/* Popup for hovered marker */}
            {hoveredMarker && (
              <Popup
                longitude={hoveredMarker.location.lng}
                latitude={hoveredMarker.location.lat}
                anchor="bottom"
                closeOnClick={false}
                closeButton={false}
              >
                <div className="bg-white px-2 py-1 text-sm font-medium">
                  {hoveredMarker.name}
                </div>
              </Popup>
            )}
          </Map>
        </motion.div>
        <motion.div
          key="background"
          initial={{ opacity: 1 }}
          animate={{ opacity: background === "static" ? 1 : 0 }}
          transition={{ duration: 0.5 }}
          className="absolute h-full w-full bg-[url('/chat-background.png')] bg-cover"
          style={{ pointerEvents: "none" }}
        ></motion.div>
      </div>
      {/* Toggle buttons to restore collapsed panels (lg only) */}
      {hasStartedChat && background === "map" && !chatVisible && (
        <button
          onClick={() => setChatVisible(true)}
          className="pointer-events-auto absolute top-1/2 left-4 z-20 hidden -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-lg backdrop-blur-sm transition-colors hover:bg-white lg:flex"
        >
          <ChevronRight className="h-5 w-5 text-gray-700" />
        </button>
      )}
      {hasStartedChat && background === "map" && !itineraryVisible && (
        <button
          onClick={() => setItineraryVisible(true)}
          className="pointer-events-auto absolute top-1/2 right-4 z-20 hidden -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-lg backdrop-blur-sm transition-colors hover:bg-white lg:flex"
        >
          <ChevronLeft className="h-5 w-5 text-gray-700" />
        </button>
      )}
      <div className="pointer-events-auto relative min-h-full w-full p-2 sm:p-4 lg:pointer-events-none lg:h-full">
        <AnimatePresence mode="wait">
          {!hasStartedChat ? (
            <WelcomeCard
              key="initial"
              input={input}
              onInputChange={handleInputChange}
              onStartChat={handleStartChat}
              botActivity={botActivity}
            />
          ) : (
            <motion.div
              key="chat"
              className={`min-h-full w-full lg:h-full ${
                background === "map"
                  ? "flex flex-col gap-4 lg:flex-row"
                  : "grid grid-cols-1 justify-center gap-4"
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {background === "map" ? (
                <>
                  {/* Chat panel */}
                  <AnimatePresence>
                    {chatVisible && (
                      <motion.div
                        key="chat-panel"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="relative"
                      >
                        <button
                          onClick={() => setChatVisible(false)}
                          className="pointer-events-auto absolute top-4 -right-3 z-10 hidden items-center justify-center rounded-full bg-white/80 p-1 shadow-md backdrop-blur-sm transition-colors hover:bg-white lg:flex"
                        >
                          <ChevronLeft className="h-4 w-4 text-gray-600" />
                        </button>
                        <Chat
                          className="h-[60vh] w-full lg:h-full lg:w-[32rem]"
                          messages={messages}
                          botActivity={botActivity}
                          input={input}
                          onInputChange={handleInputChange}
                          onSubmit={submitMessage}
                          error={error}
                          onRetry={retryMessage}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Spacer */}
                  <div className="hidden flex-1 lg:block" />

                  {/* Itinerary panel */}
                  <AnimatePresence>
                    {itineraryVisible && (
                      <motion.div
                        key="itinerary-panel"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                        className="relative lg:h-full"
                      >
                        <button
                          onClick={() => setItineraryVisible(false)}
                          className="pointer-events-auto absolute top-4 -left-3 z-10 hidden items-center justify-center rounded-full bg-white/80 p-1 shadow-md backdrop-blur-sm transition-colors hover:bg-white lg:flex"
                        >
                          <ChevronRight className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={handleStartOver}
                          className="pointer-events-auto absolute -top-2 right-3 z-10 flex items-center gap-1.5 rounded-lg bg-white/80 px-3 py-1.5 text-sm font-bold text-gray-700 shadow-md backdrop-blur-sm transition-colors hover:bg-white"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Start over
                        </button>
                        <ItineraryDisplay
                          groupedItems={groupedItems}
                          itineraryItems={itineraryItems}
                          currentItineraryId={currentItineraryId}
                          onUpdateItem={(id, updates) =>
                            setItineraryItems((prev) =>
                              prev.map((item) =>
                                item.id === id ? { ...item, ...updates } : item,
                              ),
                            )
                          }
                          onAddItem={(item) =>
                            setItineraryItems((prev) => [...prev, item])
                          }
                          onDeleteItem={(id) =>
                            setItineraryItems((prev) =>
                              prev.filter((item) => item.id !== id),
                            )
                          }
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <Chat
                  className="w-full max-w-[64rem]"
                  messages={messages}
                  botActivity={botActivity}
                  input={input}
                  onInputChange={handleInputChange}
                  onSubmit={submitMessage}
                  error={error}
                  onRetry={retryMessage}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );

  function handleToolCall(call: { toolName: string; input: unknown }) {
    const toolCall = call as ItineraryToolCall;
    switch (toolCall.toolName) {
      case "addItineraryItem":
        return addItineraryItem(toolCall.input);
      case "removeItineraryItem":
        return removeItineraryItem(toolCall.input);
      case "updateItineraryItem":
        return updateItineraryItem(toolCall.input);
      case "setLocation":
        setBackground("map");
        zoomToCity(toolCall.input.name);
        return;
      default:
        console.warn("Unknown tool call:", call);
    }
  }

  async function zoomToCity(cityName: string) {
    try {
      // Use Google Geocoding API endpoint
      const response = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityName }),
      });
      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.statusText}`);
      }
      const data = await response.json();

      if (data.geometries && data.geometries.length > 0) {
        const geometry = data.geometries[0];
        const viewportBounds = geometry.viewport; // Google uses 'viewport' for bbox {northeast: {lat, lng}, southwest: {lat, lng}}
        const location = geometry.location; // Google uses 'location' for center {lat, lng}

        // Use window dimensions
        const { innerWidth: width, innerHeight: height } = window;

        if (viewportBounds && width > 0 && height > 0) {
          try {
            // Use WebMercatorViewport to calculate the target zoom/center for the viewport
            const mapViewport = new WebMercatorViewport({
              ...viewState, // Use current view state as base
              width,
              height,
            });
            // Google viewport format: { northeast: {lat, lng}, southwest: {lat, lng} }
            // fitBounds expects: [[minLng, minLat], [maxLng, maxLat]]
            const bounds: [[number, number], [number, number]] = [
              [viewportBounds.southwest.lng, viewportBounds.southwest.lat], // Southwest corner
              [viewportBounds.northeast.lng, viewportBounds.northeast.lat], // Northeast corner
            ];
            const { longitude, latitude, zoom } = mapViewport.fitBounds(
              bounds,
              { padding: 40 }, // Adjust padding as needed
            );

            // Use mapRef to trigger the fly-to animation
            mapRef.current?.flyTo({
              center: [longitude, latitude],
              zoom,
              duration: 2000, // Animation duration in ms
              essential: true, // Consider animation essential
            });
          } catch (e) {
            console.error("Error fitting bounds, flying to center:", e);
            // Fallback: Fly to the center point if fitBounds fails
            mapRef.current?.flyTo({
              center: [location.lng, location.lat], // Use Google's location lng/lat
              zoom: 10, // Adjust fallback zoom as needed
              duration: 1500,
              essential: true,
            });
          }
        } else {
          // Fallback: Fly to the center point if no viewport or dimensions
          console.warn("No viewport/dimensions, flying to center.");
          mapRef.current?.flyTo({
            center: [location.lng, location.lat], // Use Google's location lng/lat
            zoom: 10, // Adjust fallback zoom as needed
            duration: 1500,
            essential: true,
          });
        }
      }
    } catch (error) {
      console.error("Error zooming to city:", error);
    }
  }
  function addItineraryItem(item: TravelItineraryItem) {
    setItineraryItems((prev) => [...prev, item]);
  }

  function removeItineraryItem(args: { id: string }) {
    setItineraryItems((prev) => prev.filter((item) => item.id !== args.id));
  }

  function updateItineraryItem(
    args: Partial<TravelItineraryItem> & { id: string },
  ) {
    setItineraryItems((prev) =>
      prev.map((item) => (item.id === args.id ? { ...item, ...args } : item)),
    );
  }
}
