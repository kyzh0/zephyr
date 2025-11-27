import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { getStoredValue, setStoredValue } from "@/components/map";

interface UseMapInstanceOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onLoad?: () => void;
}

interface UseMapInstanceReturn {
  map: React.RefObject<mapboxgl.Map | null>;
  isLoaded: boolean;
}

export function useMapInstance({
  containerRef,
  onLoad,
}: UseMapInstanceOptions): UseMapInstanceReturn {
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const posInitRef = useRef(false);

  // Load saved map position
  const lon = getStoredValue("lon", 172.5);
  const lat = getStoredValue("lat", -41);
  const zoom = getStoredValue("zoom", window.innerWidth > 1000 ? 5.1 : 4.3);

  // Map initialization
  useEffect(() => {
    const evenDay = new Date().getDate() % 2 === 0;
    mapboxgl.accessToken = (
      evenDay
        ? import.meta.env.VITE_MAPBOX_GL_KEY
        : import.meta.env.VITE_MAPBOX_GL_KEY_BACKUP
    ) as string;

    if (map.current || !containerRef.current) return;

    map.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v11",
      center: [lon, lat],
      zoom,
      pitchWithRotate: false,
      touchPitch: false,
    });

    map.current.dragRotate.disable();
    map.current.touchZoomRotate.disableRotation();

    // Add geolocation control
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
      })
    );

    map.current.on("load", () => {
      setIsLoaded(true);
      onLoad?.();
    });

    map.current.on("move", () => {
      if (!map.current) return;
      setStoredValue("lon", Number(map.current.getCenter().lng.toFixed(4)));
      setStoredValue("lat", Number(map.current.getCenter().lat.toFixed(4)));
      setStoredValue("zoom", Number(map.current.getZoom().toFixed(2)));
    });
  }, [containerRef, lon, lat, zoom, onLoad]);

  // Fly to saved position after load
  useEffect(() => {
    if (posInitRef.current || !map.current) return;
    map.current.flyTo({ center: [lon, lat], zoom });
    posInitRef.current = true;
  }, [lon, lat, zoom]);

  return { map, isLoaded };
}
