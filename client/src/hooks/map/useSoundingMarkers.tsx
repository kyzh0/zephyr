import { useCallback, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { formatInTimeZone } from 'date-fns-tz';

import { listSoundings } from '@/services/sounding.service';
import { getSoundingGeoJson } from '@/components/map';
import { useNavigate } from 'react-router-dom';
import { REFRESH_INTERVAL_MS } from '@/lib/utils';

interface UseSoundingMarkersOptions {
  map: React.RefObject<mapboxgl.Map | null>;
  isMapLoaded: boolean;
  isVisible: boolean;
  isHistoricData: boolean;
}

export function useSoundingMarkers({
  map,
  isMapLoaded,
  isVisible,
  isHistoricData
}: UseSoundingMarkersOptions) {
  const navigate = useNavigate();
  const markersRef = useRef<HTMLDivElement[]>([]);
  const lastRefreshRef = useRef(0);
  const isVisibleRef = useRef(isVisible);

  // Keep visibility ref in sync
  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  // Create sounding marker element
  const createSoundingMarker = useCallback(
    (
      dbId: string,
      name: string,
      currentTime: Date | null,
      currentUrl: string,
      timestamp: number
    ): HTMLDivElement => {
      const img = document.createElement('img');
      img.width = 150;
      img.className = 'webcam-img';
      img.src =
        currentUrl && currentTime ? `${import.meta.env.VITE_FILE_SERVER_PREFIX}/${currentUrl}` : '';

      const text = document.createElement('span');
      text.className =
        'absolute bottom-0 left-0 z-10 w-full h-full font-semibold text-sm text-center flex justify-center items-start';
      text.style.fontFamily = 'Arial, Helvetica, sans-serif';
      text.innerHTML = name;

      const timeText = document.createElement('span');
      timeText.className =
        'absolute bottom-0 left-0 z-10 w-full h-full text-sm text-center flex justify-center items-end';
      timeText.style.fontFamily = 'Arial, Helvetica, sans-serif';
      timeText.innerHTML = currentTime
        ? formatInTimeZone(currentTime, 'Pacific/Auckland', 'dd MMM HH:mm')
        : 'Click to view more...';

      const el = document.createElement('div');
      el.style.backgroundColor = 'white';
      el.style.visibility = 'hidden';
      el.style.zIndex = '3';
      el.id = dbId;
      el.className = 'webcam py-[18px] px-2 rounded-lg cursor-pointer';
      el.dataset.timestamp = String(timestamp);
      el.addEventListener('click', () => navigate(`/soundings/${dbId}`));
      el.appendChild(text);
      el.appendChild(img);
      el.appendChild(timeText);

      return el;
    },
    [navigate]
  );

  // Refresh soundings
  const refresh = useCallback(async () => {
    if (isHistoricData) return;
    if (document.visibilityState !== 'visible') return;
    if (!isVisibleRef.current) return;
    if (!markersRef.current.length) return;

    const timestamp = Date.now();
    if (timestamp - lastRefreshRef.current < REFRESH_INTERVAL_MS) return;

    // Check if not refreshed in 1h, or passing 30 min mark
    let nowMins = new Date().getUTCMinutes();
    let lastMins = new Date(lastRefreshRef.current).getUTCMinutes();
    if (lastMins > 30) {
      if (nowMins > lastMins) nowMins -= 30;
      lastMins -= 30;
    }
    if (timestamp - lastRefreshRef.current < 60 * 60 * 1000 && !(lastMins < 30 && nowMins >= 30))
      return;

    lastRefreshRef.current = timestamp;

    const geoJson = getSoundingGeoJson(await listSoundings());
    if (!geoJson?.features.length) return;

    for (const item of markersRef.current) {
      const match = geoJson.features.find((f) => f.properties.dbId === item.id);
      if (!match) continue;

      const currentTime = match.properties.currentTime as Date | null;
      const currentUrl = match.properties.currentUrl as string;

      item.dataset.timestamp = String(timestamp);

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
  }, [isHistoricData]);

  // Toggle visibility
  const setVisibility = useCallback((visible: boolean) => {
    for (const marker of markersRef.current) {
      // eslint-disable-next-line react-hooks/immutability
      marker.style.visibility = visible ? 'visible' : 'hidden';
    }
  }, []);

  // Initialize when map is loaded (only once - markersRef empty)
  useEffect(() => {
    if (!isMapLoaded || !map.current || markersRef.current.length > 0) return;

    let cancelled = false;

    async function initialize() {
      try {
        const soundings = await listSoundings();
        if (cancelled) return;
        const geoJson = getSoundingGeoJson(soundings);
        if (!map.current || !geoJson?.features.length || markersRef.current.length > 0) return;

        const timestamp = Date.now();
        lastRefreshRef.current = timestamp;

        for (const f of geoJson.features) {
          const name = f.properties.name as string;
          const dbId = f.properties.dbId as string;
          const currentTime = f.properties.currentTime as Date | null;
          const currentUrl = f.properties.currentUrl as string;

          const el = createSoundingMarker(dbId, name, currentTime, currentUrl, timestamp);
          el.style.visibility = isVisible ? 'visible' : 'hidden';
          markersRef.current.push(el);
          new mapboxgl.Marker(el).setLngLat(f.geometry.coordinates).addTo(map.current);
        }
      } catch {
        // ignore
      }
    }

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [isMapLoaded, isVisible, createSoundingMarker, map]);

  // Update visibility when prop changes
  useEffect(() => {
    setVisibility(isVisible);
    if (isVisible) {
      refresh();
    }
  }, [isVisible, setVisibility, refresh]);

  return {
    markers: markersRef,
    refresh,
    setVisibility
  };
}
