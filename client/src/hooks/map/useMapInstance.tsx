import { useCallback, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { getStoredValue, setStoredValue } from '@/components/map';

interface UseMapInstanceOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface UseMapInstanceReturn {
  map: React.RefObject<mapboxgl.Map | null>;
  isLoaded: boolean;
  zoom: number;
  triggerGeolocate: () => Promise<void>;
}

export function useMapInstance({ containerRef }: UseMapInstanceOptions): UseMapInstanceReturn {
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const posInitRef = useRef(false);

  // Load saved map position and zoom
  const lon = getStoredValue('lon', 172.5);
  const lat = getStoredValue('lat', -41);
  const [zoom, setZoom] = useState(() =>
    getStoredValue('zoom', window.innerWidth > 1000 ? 5.1 : 4.3)
  );

  // Map initialization — runs once. lon/lat/zoom/onLoad are initial values, not reactive.
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
      map.current?.resize();
      setIsLoaded(true);
    });

    map.current.on('move', () => {
      if (!map.current) return;
      setZoom(Number(map.current.getZoom().toFixed(2)));
      setStoredValue('lon', Number(map.current.getCenter().lng.toFixed(4)));
      setStoredValue('lat', Number(map.current.getCenter().lat.toFixed(4)));
    });

    // Resize map when container dimensions change (e.g. flex layout settling)
    const container = containerRef.current;
    const ro = new ResizeObserver(() => map.current?.resize());
    ro.observe(container);

    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const locationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const locationMarkerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trigger geolocation programmatically
  const triggerGeolocate = useCallback(async (): Promise<void> => {
    if (!map.current) return;

    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true
      });
    });

    const { longitude, latitude } = position.coords;

    map.current.flyTo({ center: [longitude, latitude], zoom: Math.max(map.current.getZoom(), 10) });

    // Remove any existing marker and pending timeout
    if (locationMarkerTimeoutRef.current) {
      clearTimeout(locationMarkerTimeoutRef.current);
      locationMarkerTimeoutRef.current = null;
    }
    locationMarkerRef.current?.remove();

    const el = document.createElement('div');
    el.style.cssText =
      'width:15px;height:15px;border-radius:50%;background:rgba(59,130,246);border:2px solid white;box-sizing:border-box;';

    locationMarkerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([longitude, latitude])
      .addTo(map.current);

    locationMarkerTimeoutRef.current = setTimeout(() => {
      locationMarkerRef.current?.remove();
      locationMarkerRef.current = null;
      locationMarkerTimeoutRef.current = null;
    }, 60_000);
  }, []);

  return { map, isLoaded, zoom, triggerGeolocate };
}
