import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const DEFAULT_LON = 172.5;
const DEFAULT_LAT = -42;
const DEFAULT_ZOOM = 5;
const MARKER_ZOOM = 12;

interface CoordinatesPickerProps {
  value?: string; // "lat, lon" format
  onChange: (value: string) => void;
}

export function CoordinatesPicker({ value, onChange }: CoordinatesPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  // Parse current value to get initial coords
  const parseValue = (val?: string): { lat: number; lng: number } | null => {
    if (!val?.trim()) return null;
    const parts = val.replace(/\s/g, "").split(",");
    if (parts.length !== 2) return null;
    const [lat, lng] = parts.map(Number);
    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat, lng };
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    const initialCoords = parseValue(value);

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_GL_KEY as string;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/kyzh0/cmkl32f5k00rg01svd1br8c1y",
      center: initialCoords
        ? [initialCoords.lng, initialCoords.lat]
        : [DEFAULT_LON, DEFAULT_LAT],
      zoom: initialCoords ? MARKER_ZOOM : DEFAULT_ZOOM,
    });

    map.current.on("load", () => {
      if (!map.current) return;

      // If we have initial coordinates, place marker
      if (initialCoords) {
        marker.current = new mapboxgl.Marker({ color: "#ef4444" })
          .setLngLat([initialCoords.lng, initialCoords.lat])
          .addTo(map.current);
      }
    });

    map.current.on("click", (e) => {
      if (!map.current) return;

      const { lng, lat } = e.lngLat;

      // Update or create marker
      if (marker.current) {
        marker.current.setLngLat([lng, lat]);
      } else {
        marker.current = new mapboxgl.Marker({ color: "#ef4444" })
          .setLngLat([lng, lat])
          .addTo(map.current);
      }

      // Format and emit coordinates (6 decimal places)
      const formattedLat = Math.round(lat * 1e6) / 1e6;
      const formattedLng = Math.round(lng * 1e6) / 1e6;
      onChange(`${formattedLat}, ${formattedLng}`);
    });

    return () => {
      map.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker when value changes externally
  useEffect(() => {
    if (!map.current) return;

    const coords = parseValue(value);
    if (coords) {
      if (marker.current) {
        marker.current.setLngLat([coords.lng, coords.lat]);
      } else if (map.current.loaded()) {
        marker.current = new mapboxgl.Marker({ color: "#ef4444" })
          .setLngLat([coords.lng, coords.lat])
          .addTo(map.current);
      }
    } else if (marker.current) {
      marker.current.remove();
      marker.current = null;
    }
  }, [value]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-[400px] rounded-md overflow-hidden border"
    />
  );
}
