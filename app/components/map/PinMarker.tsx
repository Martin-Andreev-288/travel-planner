import { Marker } from "react-map-gl/maplibre";
import { MapPin } from "lucide-react";

// Height of the pin in pixels. It stands on its map position (anchor
// "bottom"), so anything shown above the pin has to be raised by this much.
export const PIN_SIZE = 24;

interface PinMarkerProps {
  longitude: number;
  latitude: number;
  color?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function PinMarker({
  longitude,
  latitude,
  color = "#FF5630",
  onClick,
  onMouseEnter,
  onMouseLeave,
}: PinMarkerProps) {
  return (
    <Marker longitude={longitude} latitude={latitude} anchor="bottom">
      <MapPin
        size={PIN_SIZE}
        fill={color}
        stroke="#fff"
        className="cursor-pointer drop-shadow-lg"
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />
    </Marker>
  );
}
