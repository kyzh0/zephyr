import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import { formatInTimeZone } from 'date-fns-tz';

import { getWebcamGeoJson } from '@/components/map';

import { useWebcams } from '@/hooks';

interface UseWebcamMarkersOptions {
  map: React.RefObject<mapboxgl.Map | null>;
  isMapLoaded: boolean;
  isVisible: boolean;
}

interface UseWebcamMarkersResult {
  markers: React.RefObject<HTMLDivElement[]>;
  setVisibility: (visible: boolean) => void;
  error: Error | null;
}

export function useWebcamMarkers({
  map,
  isMapLoaded,
  isVisible
}: UseWebcamMarkersOptions): UseWebcamMarkersResult {
  const navigate = useNavigate();
  const markersRef = useRef<HTMLDivElement[]>([]);
  const isVisibleRef = useRef(isVisible);

  const { webcams, isLoading: webcamsLoading, error } = useWebcams();

  // Keep visibility ref in sync
  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  // Create webcam marker element
  const createWebcamMarker = useCallback(
    (
      dbId: string,
      name: string,
      currentTime: Date,
      currentUrl: string,
      timestamp: number
    ): HTMLDivElement => {
      const isStale = timestamp - currentTime.getTime() > 24 * 60 * 60 * 1000;

      const img = document.createElement('img');
      img.width = 150;
      img.src = isStale ? '' : `${import.meta.env.VITE_FILE_SERVER_PREFIX}/${currentUrl}`;
      img.className = 'webcam-img';

      const text = document.createElement('span');
      text.className =
        'absolute bottom-0 left-0 w-full h-full font-semibold text-sm text-center flex justify-center items-start';
      text.style.fontFamily = 'Arial, Helvetica, sans-serif';
      text.innerHTML = name;

      const timeText = document.createElement('span');
      timeText.className =
        'absolute bottom-0 left-0 w-full h-full text-sm text-center flex justify-center items-end';
      timeText.style.fontFamily = 'Arial, Helvetica, sans-serif';

      if (isStale) {
        timeText.innerHTML = 'No images in the last 24h.';
        timeText.style.color = '#ff4261';
      } else {
        timeText.innerHTML = formatInTimeZone(currentTime, 'Pacific/Auckland', 'dd MMM HH:mm');
      }

      const el = document.createElement('div');
      el.style.visibility = 'hidden';
      el.id = dbId;
      el.className = 'z-40 bg-white py-[18px] px-2 rounded-lg cursor-pointer';

      el.addEventListener('click', () => navigate(`/webcams/${dbId}`));
      el.appendChild(text);
      el.appendChild(img);
      el.appendChild(timeText);

      return el;
    },
    [navigate]
  );

  // Track mapbox Marker instances so we can remove them on cleanup
  const mapboxMarkersRef = useRef<mapboxgl.Marker[]>([]);

  // Sync markers whenever webcam data changes
  useEffect(() => {
    if (!isMapLoaded || !map.current || webcamsLoading || !webcams?.length) return;

    const geoJson = getWebcamGeoJson(webcams);
    if (!geoJson?.features.length) return;

    const timestamp = Date.now();

    if (markersRef.current.length === 0) {
      // Initial creation
      for (const f of geoJson.features) {
        const name = f.properties.name as string;
        const dbId = f.properties.dbId as string;
        const currentTime = f.properties.currentTime as Date;
        const currentUrl = f.properties.currentUrl as string;

        const el = createWebcamMarker(dbId, name, currentTime, currentUrl, timestamp);
        el.style.visibility = isVisibleRef.current ? 'visible' : 'hidden';
        markersRef.current.push(el);
        const mbMarker = new mapboxgl.Marker(el)
          .setLngLat(f.geometry.coordinates)
          .addTo(map.current);
        mapboxMarkersRef.current.push(mbMarker);
      }
    } else {
      // Update existing markers with fresh data
      for (const item of markersRef.current) {
        const match = geoJson.features.find((f) => f.properties.dbId === item.id);
        if (!match) continue;

        const currentTime = match.properties.currentTime as Date;
        const currentUrl = match.properties.currentUrl as string;
        const isStale = timestamp - currentTime.getTime() > 24 * 60 * 60 * 1000;

        for (const child of Array.from(item.children)) {
          if ((child as HTMLElement).className === 'webcam-img') {
            (child as HTMLImageElement).src = isStale
              ? ''
              : `${import.meta.env.VITE_FILE_SERVER_PREFIX}/${currentUrl}`;
          } else if ((child as HTMLElement).className.includes('items-end')) {
            if (isStale) {
              child.innerHTML = 'No images in the last 24h.';
              (child as HTMLElement).style.color = '#ff4261';
            } else {
              child.innerHTML = formatInTimeZone(currentTime, 'Pacific/Auckland', 'dd MMM HH:mm');
              (child as HTMLElement).style.color = '';
            }
          }
        }
      }
    }
  }, [webcams, webcamsLoading, isMapLoaded, map, createWebcamMarker]);

  // Cleanup markers only on unmount
  useEffect(() => {
    return () => {
      mapboxMarkersRef.current.forEach((m) => m.remove());
      mapboxMarkersRef.current = [];
      markersRef.current = [];
    };
  }, []);

  // Toggle visibility
  const setVisibility = useCallback((visible: boolean) => {
    for (const marker of markersRef.current) {
      // eslint-disable-next-line react-hooks/immutability
      marker.style.visibility = visible ? 'visible' : 'hidden';
    }
  }, []);

  // Update visibility when prop changes
  useEffect(() => {
    setVisibility(isVisible);
  }, [isVisible, setVisibility]);

  return {
    markers: markersRef,
    setVisibility,
    error
  };
}
