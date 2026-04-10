import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import 'mapbox-gl/dist/mapbox-gl.css';

import SEO from '@/components/SEO';
import { MapControlButtons } from '@/components/map';
import type { MapOverlay, WindUnit } from '@/components/map/map.types';

import { useAppContext } from '@/context/AppContext';
import { usePersistedState } from '@/hooks';
import {
  useMapInstance,
  useMapControls,
  useStationMarkers,
  useWebcamMarkers,
  useSoundingMarkers,
  useSiteMarkers,
  useLandingMarkers
} from '@/hooks/map';

export default function Map() {
  const { flyingMode } = useAppContext();
  const [overlay] = usePersistedState<MapOverlay>('overlay', null);
  const [unit] = usePersistedState<WindUnit>('unit', 'kmh');
  const [viewMode] = usePersistedState<'stations' | 'sites'>('viewMode', 'stations');

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
    renderHistoricalData,
    renderCurrentData,
    setInteractive: setStationMarkersInteractive
  } = useStationMarkers({
    map,
    isMapLoaded: isLoaded,
    isHistoricData,
    unit,
    isVisible: viewMode === 'stations',
    mapZoom: zoom
  });

  // Initialize webcam markers
  useWebcamMarkers({
    map,
    isMapLoaded: isLoaded,
    isVisible: overlay === 'webcams'
  });

  // Initialize sounding markers
  useSoundingMarkers({
    map,
    isMapLoaded: isLoaded,
    isVisible: overlay === 'soundings',
    isHistoricData
  });

  // Initialize landing markers below sites
  const { setTransparent: setLandingTransparent } = useLandingMarkers({
    map,
    isMapLoaded: isLoaded,
    isVisible: viewMode === 'sites'
  });

  // Initialize site markers
  const { setWindDirectionFilter: setSiteDirectionFilter } = useSiteMarkers({
    map,
    isMapLoaded: isLoaded,
    isVisible: viewMode === 'sites'
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
    renderHistoricalData,
    renderCurrentData
  });

  // Filter markers by elevation
  useEffect(() => {
    const markers = document.querySelectorAll('div.marker');
    markers.forEach((m) => {
      const elevation = Number((m as HTMLElement).dataset.elevation);
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
            'Weather station aggregator built for free flying and wind sports in New Zealand. Browse live wind and weather data from stations across the country on an interactive map.',
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
