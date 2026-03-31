import { useCallback, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { getStoredValue, setStoredValue } from '@/components/map';

interface UseMapInstanceOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onLoad?: () => void;
}

interface UseMapInstanceReturn {
  map: React.RefObject<mapboxgl.Map | null>;
  isLoaded: boolean;
  zoom: number;
  triggerGeolocate: () => Promise<void>;
}

export function useMapInstance({
  containerRef,
  onLoad
}: UseMapInstanceOptions): UseMapInstanceReturn {
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const posInitRef = useRef(false);

  // Load saved map position and zoom
  const lon = getStoredValue('lon', 172.5);
  const lat = getStoredValue('lat', -41);
  const [zoom, setZoom] = useState(() =>
    getStoredValue('zoom', window.innerWidth > 1000 ? 5.1 : 4.3)
  );

  // Map initialization
  useEffect(() => {
    if (map.current || !containerRef.current) return;

    const evenDay = new Date().getDate() % 2 === 0;
    mapboxgl.accessToken = (
      evenDay ? import.meta.env.VITE_MAPBOX_GL_KEY : import.meta.env.VITE_MAPBOX_GL_KEY_BACKUP
    ) as string;

    map.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v11',
      center: [lon, lat],
      zoom,
      pitchWithRotate: false,
      touchPitch: false
    });

    map.current.dragRotate.disable();
    map.current.touchZoomRotate.disableRotation();

    map.current.on('load', () => {
      setIsLoaded(true);
      onLoad?.();
    });

    map.current.on('move', () => {
      if (!map.current) return;
      setZoom(Number(map.current.getZoom().toFixed(2)));
      setStoredValue('lon', Number(map.current.getCenter().lng.toFixed(4)));
      setStoredValue('lat', Number(map.current.getCenter().lat.toFixed(4)));
    });
  }, [containerRef, lon, lat, zoom, onLoad]);

  // Fly to saved position after load
  useEffect(() => {
    if (posInitRef.current || !map.current) return;
    map.current.flyTo({ center: [lon, lat], zoom });
    posInitRef.current = true;
  }, [lon, lat, zoom]);

  // Persist zoom to localStorage when it changes from map interaction
  useEffect(() => {
    setStoredValue('zoom', Number(zoom.toFixed(2)));
  }, [zoom]);

  // Trigger geolocation programmatically
  const triggerGeolocate = useCallback(async (): Promise<void> => {
    if (!map.current) return;

    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true
      });
    });

    map.current.flyTo({
      center: [position.coords.longitude, position.coords.latitude],
      zoom: 10
    });
  }, []);

  return { map, isLoaded, zoom, triggerGeolocate };
}
