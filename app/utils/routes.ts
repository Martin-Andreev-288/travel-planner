import { MapRef } from "react-map-gl/maplibre";
import { Marker } from "./markers";

const routeColors = ["#3b9ddd", "#e6b91e", "#a63d40", "#90a959"];

export async function fetchAndDrawDayRoutes(
  markersByDay: Marker[][],
  map: ReturnType<MapRef["getMap"]>,
  drawnRoutes: string[],
) {
  // Process each day's markers
  markersByDay.forEach((markers, dayIndex) => {
    if (markers.length < 2) {
      // Remove route if exists
      if (drawnRoutes[dayIndex]) {
        removeDayRoute(map, dayIndex);
        delete drawnRoutes[dayIndex];
      }
      return;
    }

    const coordinates = markers.map(
      (marker) =>
        [marker.location.lng, marker.location.lat] as [number, number],
    );
    const coordinatesStr = coordinatesToString(coordinates);
    if (drawnRoutes[dayIndex] === coordinatesStr) return;

    fetchAndDrawDayRoute(dayIndex, coordinates, map);
    drawnRoutes[dayIndex] = coordinatesStr;
  });

  if (markersByDay.length < drawnRoutes.length) {
    for (let i = markersByDay.length; i < drawnRoutes.length - 1; i++) {
      removeDayRoute(map, i);
      delete drawnRoutes[i];
    }
  }
}

async function fetchAndDrawDayRoute(
  dayIndex: number,
  coordinates: [number, number][],
  map: ReturnType<MapRef["getMap"]>,
) {
  try {
    const geometry = await fetchRouteGeometry(coordinates);
    if (!geometry) return;

    drawDayRoute(map, geometry, dayIndex);
  } catch (error) {
    console.error(`Error drawing route for day ${dayIndex}:`, error);
  }
}

const routeGeometryCache: Record<string, GeoJSON.Geometry> = {};
function coordinatesToString(coordinates: [number, number][]) {
  return coordinates.map((coord) => coord.join(",")).join(";");
}

async function fetchRouteGeometry(coordinates: [number, number][]) {
  const coordinatesStr = coordinatesToString(coordinates);

  if (routeGeometryCache[coordinatesStr])
    return routeGeometryCache[coordinatesStr];

  const response = await fetch(
    `https://router.project-osrm.org/route/v1/walking/${coordinatesStr}?geometries=geojson&overview=full`,
  );
  const data = await response.json();
  const geometry = data.routes[0]?.geometry;
  routeGeometryCache[coordinatesStr] = geometry;
  return geometry;
}

function removeDayRoute(map: ReturnType<MapRef["getMap"]>, dayIndex: number) {
  const sourceId = `route-day-${dayIndex}`;
  const layerId = `route-layer-${dayIndex}`;

  if (map.getLayer(layerId)) {
    map.removeLayer(layerId);
  }
  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }
}

function drawDayRoute(
  map: ReturnType<MapRef["getMap"]>,
  geometry: GeoJSON.Geometry,
  dayIndex: number,
) {
  const sourceId = `route-day-${dayIndex}`;
  const layerId = `route-layer-${dayIndex}`;
  const color = routeColors[dayIndex % routeColors.length];

  removeDayRoute(map, dayIndex);

  map.addSource(sourceId, {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: geometry,
    },
  });

  map.addLayer({
    id: layerId,
    type: "line",
    source: sourceId,
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": color,
      "line-width": 6,
      "line-opacity": 0.8,
    },
  });
}
