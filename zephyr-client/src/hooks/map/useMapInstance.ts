import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { getStoredValue, setStoredValue } from "@/components/map";
import { toast } from "sonner";

// LINZ API key - you'll need to set this in your .env file
const LINZ_API_KEY = import.meta.env.VITE_LINZ_API_KEY as string;

// Tile layer URLs
const LINZ_TOPO_URL = `https://basemaps.linz.govt.nz/v1/tiles/topographic/WebMercatorQuad/{z}/{x}/{y}.webp?api=${LINZ_API_KEY}`;
const LINZ_AERIAL_URL = `https://basemaps.linz.govt.nz/v1/tiles/aerial/WebMercatorQuad/{z}/{x}/{y}.webp?api=${LINZ_API_KEY}`;

// Attribution
const LINZ_ATTRIBUTION =
  '© <a href="https://www.linz.govt.nz/">LINZ</a> CC BY 4.0';

interface UseMapInstanceOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onLoad?: () => void;
}

interface UseMapInstanceReturn {
  map: React.RefObject<L.Map | null>;
  isLoaded: boolean;
  triggerGeolocate: () => void;
  setMapStyle: (style: "topo" | "satellite") => void;
}

export function useMapInstance({
  containerRef,
  onLoad,
}: UseMapInstanceOptions): UseMapInstanceReturn {
  const map = useRef<L.Map | null>(null);
  const topoLayerRef = useRef<L.TileLayer | null>(null);
  const aerialLayerRef = useRef<L.TileLayer | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved map position
  const lon = getStoredValue("lon", 172.5);
  const lat = getStoredValue("lat", -41);
  const zoom = getStoredValue("zoom", window.innerWidth > 1000 ? 6 : 5);

  // Map initialization
  useEffect(() => {
    if (map.current || !containerRef.current) return;

    // Create tile layers
    const topoLayer = L.tileLayer(LINZ_TOPO_URL, {
      attribution: LINZ_ATTRIBUTION,
      maxZoom: 18,
      minZoom: 3,
    });

    const aerialLayer = L.tileLayer(LINZ_AERIAL_URL, {
      attribution: LINZ_ATTRIBUTION,
      maxZoom: 18,
      minZoom: 3,
    });

    topoLayerRef.current = topoLayer;
    aerialLayerRef.current = aerialLayer;

    // Create map
    map.current = L.map(containerRef.current, {
      center: [lat, lon],
      zoom,
      layers: [topoLayer], // Start with topo layer
      zoomControl: false, // We'll use our own controls
    });

    // Add zoom control to bottom right
    L.control.zoom({ position: "bottomright" }).addTo(map.current);

    // Fire load callback
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoaded(true);
    onLoad?.();

    // Save position on move
    map.current.on("moveend", () => {
      if (!map.current) return;
      const center = map.current.getCenter();
      setStoredValue("lon", Number(center.lng.toFixed(4)));
      setStoredValue("lat", Number(center.lat.toFixed(4)));
      setStoredValue("zoom", Number(map.current.getZoom().toFixed(2)));
    });

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [containerRef, lon, lat, zoom, onLoad]);

  // Switch between topo and satellite layers
  const setMapStyle = useCallback((style: "topo" | "satellite") => {
    if (!map.current || !topoLayerRef.current || !aerialLayerRef.current)
      return;

    if (style === "satellite") {
      if (map.current.hasLayer(topoLayerRef.current)) {
        map.current.removeLayer(topoLayerRef.current);
      }
      if (!map.current.hasLayer(aerialLayerRef.current)) {
        aerialLayerRef.current.addTo(map.current);
      }
    } else {
      if (map.current.hasLayer(aerialLayerRef.current)) {
        map.current.removeLayer(aerialLayerRef.current);
      }
      if (!map.current.hasLayer(topoLayerRef.current)) {
        topoLayerRef.current.addTo(map.current);
      }
    }
  }, []);

  // Trigger geolocation programmatically
  const triggerGeolocate = useCallback(() => {
    if (!map.current) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.current?.flyTo(
          [position.coords.latitude, position.coords.longitude],
          12
        );
      },
      (error) => {
        toast.error("Geolocation error: " + error.message);
      },
      { enableHighAccuracy: true }
    );
  }, []);

  return { map, isLoaded, triggerGeolocate, setMapStyle };
}
