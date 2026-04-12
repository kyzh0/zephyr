import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import { formatInTimeZone } from 'date-fns-tz';

import { getSoundingGeoJson } from '@/components/map';

import { useSoundings } from '@/hooks';

interface UseSoundingMarkersOptions {
  map: React.RefObject<mapboxgl.Map | null>;
  isMapLoaded: boolean;
  isVisible: boolean;
  isHistoricData: boolean;
}

interface UseSoundingMarkersResult {
  markers: React.RefObject<HTMLDivElement[]>;
  setVisibility: (visible: boolean) => void;
  error: Error | null;
}

export function useSoundingMarkers({
  map,
  isMapLoaded,
  isVisible,
  isHistoricData
}: UseSoundingMarkersOptions): UseSoundingMarkersResult {
  const navigate = useNavigate();
  const markersRef = useRef<HTMLDivElement[]>([]);
  const isVisibleRef = useRef(isVisible);
  const isHistoricDataRef = useRef(isHistoricData);

  const { soundings, isLoading: soundingsLoading, error } = useSoundings();

  // Keep refs in sync
  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);
  useEffect(() => {
    isHistoricDataRef.current = isHistoricData;
  }, [isHistoricData]);

  // Create sounding marker element
  const createSoundingMarker = useCallback(
    (dbId: string, name: string, currentTime: Date | null, currentUrl: string): HTMLDivElement => {
      const img = document.createElement('img');
      img.width = 150;
      img.className = 'webcam-img';
      img.src =
        currentUrl && currentTime ? `${import.meta.env.VITE_FILE_SERVER_PREFIX}/${currentUrl}` : '';

      const text = document.createElement('span');
      text.className =
        'absolute bottom-0 left-0 w-full h-full font-semibold text-sm text-center flex justify-center items-start';
      text.style.fontFamily = 'Arial, Helvetica, sans-serif';
      text.innerHTML = name;

      const timeText = document.createElement('span');
      timeText.className =
        'absolute bottom-0 left-0 w-full h-full text-sm text-center flex justify-center items-end';
      timeText.style.fontFamily = 'Arial, Helvetica, sans-serif';
      timeText.innerHTML = currentTime
        ? formatInTimeZone(currentTime, 'Pacific/Auckland', 'dd MMM HH:mm')
        : 'Click to view more...';

      const el = document.createElement('div');
      el.style.visibility = 'hidden';
      el.id = dbId;
      el.className = 'z-40 bg-white py-[18px] px-2 rounded-lg cursor-pointer';

      el.addEventListener('click', () => navigate(`/soundings/${dbId}`));
      el.appendChild(text);
      el.appendChild(img);
      el.appendChild(timeText);

      return el;
    },
    [navigate]
  );

  // Track mapbox Marker instances so we can remove them on cleanup
  const mapboxMarkersRef = useRef<mapboxgl.Marker[]>([]);

  // Sync markers whenever sounding data changes
  useEffect(() => {
    if (!isMapLoaded || !map.current || soundingsLoading || !soundings?.length) return;
    if (isHistoricDataRef.current) return;

    const geoJson = getSoundingGeoJson(soundings);
    if (!geoJson?.features.length) return;

    if (markersRef.current.length === 0) {
      // Initial creation
      for (const f of geoJson.features) {
        const name = f.properties.name as string;
        const dbId = f.properties.dbId as string;
        const currentTime = f.properties.currentTime as Date | null;
        const currentUrl = f.properties.currentUrl as string;

        const el = createSoundingMarker(dbId, name, currentTime, currentUrl);
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

        const currentTime = match.properties.currentTime as Date | null;
        const currentUrl = match.properties.currentUrl as string;

        for (const child of Array.from(item.children)) {
          if ((child as HTMLElement).className === 'webcam-img') {
            (child as HTMLImageElement).src = currentUrl
              ? `${import.meta.env.VITE_FILE_SERVER_PREFIX}/${currentUrl}`
              : '';
          } else if ((child as HTMLElement).className.includes('items-end')) {
            child.innerHTML = currentTime
              ? formatInTimeZone(currentTime, 'Pacific/Auckland', 'dd MMM HH:mm')
              : 'Click to view more...';
          }
        }
      }
    }
  }, [soundings, soundingsLoading, isMapLoaded, map, createSoundingMarker]);

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
