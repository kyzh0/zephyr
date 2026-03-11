import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import 'mapbox-gl/dist/mapbox-gl.css';
import SEO from '@/components/SEO';
import { useAppContext } from '@/context/AppContext';
import { MapControlButtons, getStoredValue } from '@/components/map';

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

export default function Map() {
  const { setRefreshedStations, setRefreshedWebcams, flyingMode } = useAppContext();

  // Map container ref
  const mapContainer = useRef<HTMLDivElement>(null);

  // historyOffset lives here so marker hooks can read isHistoricData reactively
  const [historyOffset, setHistoryOffset] = useState(0);
  const isHistoricData = historyOffset < 0;

  // Initialize map
  const { map, isLoaded, zoom, triggerGeolocate } = useMapInstance({
    containerRef: mapContainer
  });

  // Initialize station markers
  const {
    refresh: refreshStations,
    renderHistoricalData,
    renderCurrentData,
    setInteractive: setStationMarkersInteractive
  } = useStationMarkers({
    map,
    isMapLoaded: isLoaded,
    isHistoricData,
    unit: getStoredValue('unit', 'kmh'), // initial unit only; hook re-renders on unit change via controls
    isVisible: getStoredValue<'stations' | 'sites'>('viewMode', 'stations') === 'stations',
    mapZoom: zoom,
    onRefresh: setRefreshedStations
  });

  // Initialize webcam markers
  const { refresh: refreshWebcams } = useWebcamMarkers({
    map,
    isMapLoaded: isLoaded,
    isVisible: getStoredValue('showWebcams', false),
    onRefresh: setRefreshedWebcams
  });

  // Initialize sounding markers
  const { refresh: refreshSoundings } = useSoundingMarkers({
    map,
    isMapLoaded: isLoaded,
    isVisible: getStoredValue('showSoundings', false),
    isHistoricData
  });

  // Initialize landing markers below sites
  const { setTransparent: setLandingTransparent } = useLandingMarkers({
    map,
    isMapLoaded: isLoaded,
    isVisible: getStoredValue<'stations' | 'sites'>('viewMode', 'stations') === 'sites'
  });

  // Initialize site markers
  const { setWindDirectionFilter: setSiteDirectionFilter } = useSiteMarkers({
    map,
    isMapLoaded: isLoaded,
    isVisible: getStoredValue<'stations' | 'sites'>('viewMode', 'stations') === 'sites'
  });

  // All UI control state and handlers
  const controls = useMapControls({
    map,
    triggerGeolocate,
    flyingMode,
    historyOffset,
    setHistoryOffset,
    setLandingTransparent,
    setStationMarkersInteractive,
    setSiteDirectionFilter,
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
      m.classList.toggle('hidden', elevation < controls.stationElevationFilter);
    });
  }, [controls.stationElevationFilter]);

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
