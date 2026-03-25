"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TravelItineraryItem } from "../api/chat/itinerary-store";
import { ItineraryToolCall } from "../api/chat/tool-set";
import ItineraryDisplay from "../components/itinerary";
import Chat from "../components/chat";
import WelcomeCard from "../components/welcome-card";
import Map, { MapRef, ViewState } from "react-map-gl/maplibre";
import { Popup } from "react-map-gl/maplibre";
import WebMercatorViewport from "viewport-mercator-project";
import "maplibre-gl/dist/maplibre-gl.css";
import { ToolCall } from "ai";
import PinMarker from "../components/map/PinMarker";
import { enrichItineraryWithPlace } from "../utils/places";
import { groupMarkersByDay, type Marker } from "../utils/markers";
import { fetchAndDrawDayRoutes } from "../utils/routes";

export default function Home() {
  const [itineraryItems, setItineraryItems] = useState<TravelItineraryItem[]>(
    [],
  );
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [background, setBackground] = useState<"static" | "map">("static");
  const [viewState, setViewState] = useState<Partial<ViewState>>({});
  const [markersByDay, setMarkersByDay] = useState<Marker[][]>([]);
  const [hoveredMarker, setHoveredMarker] = useState<Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<MapRef>(null);

  const { messages, setMessages, input, setInput, handleSubmit, status } =
    useChat({
      api: "/api/chat",
      maxSteps: 2,
      onToolCall: handleToolCall,
    });

  useEffect(() => {
    // Development feature that enables calling arbitrary tools via URL hash
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) return;
      setHasStartedChat(true);
      setBackground("map");
      const decodedHash = decodeURIComponent(hash);
      const toolCalls = JSON.parse(decodedHash);
      for (const toolCall of toolCalls) {
        handleToolCall({ toolCall });
      }
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

  useEffect(() => {
    if (!mapRef.current || markersByDay.length === 0 || !mapLoaded) return;
    const map = mapRef.current.getMap();
    fetchAndDrawDayRoutes(markersByDay, map);
  }, [markersByDay, mapLoaded]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    return () => {
      map.remove();
    };
  }, []);

  const botActivity = status === "submitted" || status === "streaming";

  const handleStartChat = () => {
    if (input.trim()) {
      setHasStartedChat(true);
      if (messages.length === 0) {
        setMessages([
          {
            id: "initial-prompt",
            role: "assistant",
            content: "Hello! Where would you like to travel?",
          },
        ]);
      }
      handleSubmit();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
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
              className={`grid min-h-full w-full lg:h-full ${background === "map" ? "grid-cols-1 lg:grid-cols-[auto_1fr_auto]" : "grid-cols-1"} justify-center gap-4`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Left Column: Chat */}
              <Chat
                className={
                  background === "map"
                    ? "h-[60vh] w-full lg:h-full lg:w-[32rem]"
                    : "w-full max-w-[64rem]"
                }
                messages={messages}
                botActivity={botActivity}
                input={input}
                onInputChange={handleInputChange}
                onSubmit={handleSubmit}
              />

              {background === "map" && (
                <>
                  {/* Center Column: Empty Space */}
                  <div className="hidden lg:block" />

                  {/* Right Column: Itinerary */}
                  <ItineraryDisplay groupedItems={groupedItems} />
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );

  function handleToolCall(tool: { toolCall: ToolCall<string, unknown> }) {
    const toolCall = tool.toolCall as ItineraryToolCall;
    switch (toolCall.toolName) {
      case "addItineraryItem":
        return addItineraryItem(toolCall.args);
      case "removeItineraryItem":
        return removeItineraryItem(toolCall.args);
      case "updateItineraryItem":
        return updateItineraryItem(toolCall.args);
      case "setLocation":
        setBackground("map");
        const location = toolCall.args.name;
        zoomToCity(location);
        return { status: "ok" };
      default:
        console.warn("Unknown tool call:", toolCall);
        return { status: "ignored" };
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
    return { status: "ok" };
  }

  function removeItineraryItem(args: { id: string }) {
    setItineraryItems((prev) => prev.filter((item) => item.id !== args.id));
    return { status: "ok" };
  }

  function updateItineraryItem(
    args: Partial<TravelItineraryItem> & { id: string },
  ) {
    setItineraryItems((prev) =>
      prev.map((item) => (item.id === args.id ? { ...item, ...args } : item)),
    );
    return { status: "ok" };
  }
}
