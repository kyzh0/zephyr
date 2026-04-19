import { useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import 'mapbox-gl/dist/mapbox-gl.css';

import SEO from '@/components/SEO';
import { MapControlButtons, MAP_OVERLAYS, MAP_VIEW_MODES } from '@/components/map';

import { useMapStore } from '@/store';
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
  const overlay = useMapStore((s) => s.overlay);
  const unit = useMapStore((s) => s.unit);
  const viewMode = useMapStore((s) => s.viewMode);
  const historyOffset = useMapStore((s) => s.historyOffset);
  const stationElevationFilter = useMapStore((s) => s.stationElevationFilter);
  const isHistoricData = historyOffset < 0;

  const mapContainer = useRef<HTMLDivElement>(null);

  const { map, isLoaded, zoom, triggerGeolocate, flyTo } = useMapInstance({
    containerRef: mapContainer
  });

  const {
    renderHistoricalData,
    renderCurrentData,
    setInteractive: setStationMarkersInteractive
  } = useStationMarkers({
    map,
    isMapLoaded: isLoaded,
    isHistoricData,
    unit,
    isVisible: viewMode === MAP_VIEW_MODES.STATIONS,
    mapZoom: zoom
  });

  useWebcamMarkers({
    map,
    isMapLoaded: isLoaded,
    isVisible: overlay === MAP_OVERLAYS.WEBCAMS
  });

  useSoundingMarkers({
    map,
    isMapLoaded: isLoaded,
    isVisible: overlay === MAP_OVERLAYS.SOUNDINGS,
    isHistoricData
  });

  const { setTransparent: setLandingTransparent } = useLandingMarkers({
    map,
    isMapLoaded: isLoaded,
    isVisible: viewMode === MAP_VIEW_MODES.SITES
  });

  const { setWindDirectionFilter: setSiteDirectionFilter } = useSiteMarkers({
    map,
    isMapLoaded: isLoaded,
    isVisible: viewMode === MAP_VIEW_MODES.SITES
  });

  const handlers = useMapControls({
    map,
    triggerGeolocate,
    flyTo,
    setLandingTransparent,
    setStationMarkersInteractive,
    setSiteDirectionFilter,
    renderHistoricalData,
    renderCurrentData
  });

  // Filter markers by elevation
  useEffect(() => {
    if (!mapContainer.current) return;
    const markers = mapContainer.current.querySelectorAll('div.marker');
    const [minElev, maxElev] = stationElevationFilter;
    for (const m of markers) {
      const elevation = Number((m as HTMLElement).dataset.elevation);
      if (!isNaN(elevation)) {
        m.classList.toggle('hidden', elevation < minElev || elevation > maxElev);
      }
    }
  }, [stationElevationFilter]);

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

      <MapControlButtons {...handlers} />

      <div ref={mapContainer} className="w-full h-full" />
      <Outlet />
    </div>
  );
}
