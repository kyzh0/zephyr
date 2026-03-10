import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import 'mapbox-gl/dist/mapbox-gl.css';
import SEO from '@/components/SEO';
import { useAppContext } from '@/context/AppContext';
import { MapControlButtons, getStoredValue } from '@/components/map';
import type { MapOverlay } from '@/components/map';

import {
  useMapInstance,
  useMapControls,
  useStationMarkers,
  useWebcamMarkers,
  useSoundingMarkers,
  useSiteMarkers,
  useLandingMarkers
} from '@/hooks/map';
import { REFRESH_INTERVAL_MS } from '@/lib/utils';

/** Compute the initial overlay state from localStorage (read once at module scope per render) */
function getInitialOverlay(): MapOverlay {
  if (getStoredValue('showWebcams', false)) return 'webcams';
  if (getStoredValue('showSoundings', false)) return 'soundings';
  return null;
}

export default function Map() {
  const { setRefreshedStations, setRefreshedWebcams, flyingMode } = useAppContext();

  // Map container ref
  const mapContainer = useRef<HTMLDivElement>(null);

  // historyOffset lives here so marker hooks can read isHistoricData reactively
  const [historyOffset, setHistoryOffset] = useState(0);
  const isHistoricData = historyOffset < 0;

  // Compute initial overlay once — passed to both marker hooks (for initial isVisible)
  // and to useMapControls (to seed its overlay state)
  // eslint-disable-next-line react-hooks/use-memo
  const initialOverlay = useMemo(getInitialOverlay, []);

  // Initialize map
  const { map, isLoaded, zoom, triggerGeolocate } = useMapInstance({
    containerRef: mapContainer
  });

  // Initialize station markers
  const {
    refresh: refreshStations,
    renderHistoricalData,
    renderCurrentData,
    setInteractive: setStationMarkersInteractive,
    setVisibility: setStationVisibility
  } = useStationMarkers({
    map,
    isMapLoaded: isLoaded,
    isHistoricData,
    unit: getStoredValue('unit', 'kmh'), // initial unit only; hook re-renders on unit change via controls
    isVisible: true,
    mapZoom: zoom,
    onRefresh: setRefreshedStations
  });

  // Initialize webcam markers
  const { refresh: refreshWebcams, setVisibility: setWebcamVisibility } = useWebcamMarkers({
    map,
    isMapLoaded: isLoaded,
    isVisible: initialOverlay === 'webcams',
    onRefresh: setRefreshedWebcams
  });

  // Initialize sounding markers
  const { refresh: refreshSoundings, setVisibility: setSoundingVisibility } = useSoundingMarkers({
    map,
    isMapLoaded: isLoaded,
    isVisible: initialOverlay === 'soundings',
    isHistoricData
  });

  // Initialize landing markers below sites
  useLandingMarkers({
    map,
    isMapLoaded: isLoaded,
    isVisible: false
  });

  // Initialize site markers
  const { setVisibility: setSiteVisibility } = useSiteMarkers({
    map,
    isMapLoaded: isLoaded,
    isVisible: false
  });

  // All UI control state and handlers
  const controls = useMapControls({
    map,
    triggerGeolocate,
    flyingMode,
    historyOffset,
    setHistoryOffset,
    initialOverlay,
    setWebcamVisibility,
    setSoundingVisibility,
    setSiteVisibility,
    setStationVisibility,
    setStationMarkersInteractive,
    refreshWebcams,
    refreshSoundings,
    renderHistoricalData,
    renderCurrentData
  });

  // Auto-refresh interval (disabled when in history mode)
  useEffect(() => {
    if (!isLoaded || isHistoricData) return;

    const interval = setInterval(async () => {
      try {
        await refreshStations();
        await refreshWebcams();
        await refreshSoundings();
      } catch {
        clearInterval(interval);
      }
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isLoaded, isHistoricData, refreshStations, refreshWebcams, refreshSoundings]);

  // Refresh on tab visibility change
  useEffect(() => {
    const handleVisibilityChange = async () => {
      await refreshStations();
      await refreshWebcams();
      await refreshSoundings();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshStations, refreshWebcams, refreshSoundings]);

  // Filter markers by elevation
  useEffect(() => {
    const markers = document.querySelectorAll('div.marker');
    markers.forEach((m) => {
      const elevation = Number(m.getAttribute('elevation'));
      m.classList.toggle('hidden', elevation < controls.elevationFilter);
    });
  }, [controls.elevationFilter]);

  return (
    <div className="absolute top-0 left-0 h-dvh w-screen flex flex-col">
      <SEO
        path="/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'Zephyr',
          url: 'https://www.zephyrapp.nz',
          description:
            'Weather station aggregator built for free flying in New Zealand. Browse live wind and weather data from stations across the country on an interactive map.',
          applicationCategory: 'WeatherApplication',
          operatingSystem: 'Any',
          areaServed: {
            '@type': 'Country',
            name: 'New Zealand'
          }
        }}
      />

      {/* Red border overlay when in history mode */}
      {isHistoricData && (
        <div className="absolute inset-0 border-4 border-red-500 pointer-events-none z-40" />
      )}

      <MapControlButtons {...controls} />

      <div ref={mapContainer} className="w-full h-full" />
      <Outlet />
    </div>
  );
}
