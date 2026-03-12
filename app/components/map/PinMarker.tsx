import { Marker } from "react-map-gl/maplibre";
import { MapPin } from "lucide-react";

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
        size={24}
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
