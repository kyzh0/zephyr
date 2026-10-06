import { useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import 'mapbox-gl/dist/mapbox-gl.css';

import SEO from '@/components/SEO';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { MapControlButtons, MAP_OVERLAYS, MAP_VIEW_MODES } from '@/components/map';

import { useMapStore } from '@/store';
import {
  useMapInstance,
  useMapControls,
  useStationMarkers,
  useWebcamMarkers,
  useSoundingMarkers,
  useSiteMarkers,
  useLandingMarkers,
  useAirspaceLayer
} from '@/hooks/map';

export default function Map() {
  const overlay = useMapStore((s) => s.overlay);
  const unit = useMapStore((s) => s.unit);
  const viewMode = useMapStore((s) => s.viewMode);
  const historyOffset = useMapStore((s) => s.historyOffset);
  const stationElevationFilter = useMapStore((s) => s.stationElevationFilter);
  const isAirspaceVisible = useMapStore((s) => s.isAirspaceVisible);
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

  const airspace = useAirspaceLayer({
    map,
    isMapLoaded: isLoaded,
    isVisible: isAirspaceVisible
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
    <div className="fixed inset-0 flex flex-col">
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

      <div className="relative min-h-0 flex-1">
        {/* Red border overlay when in history mode */}
        {isHistoricData && (
          <div className="absolute inset-0 border-4 border-red-500 pointer-events-none z-40" />
        )}

        <MapControlButtons {...handlers} isAirspaceLoading={airspace.isLoading} />
        <div ref={mapContainer} className="h-full w-full" />
      </div>

      {isAirspaceVisible && (
        <footer className="shrink-0 border-t bg-background px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-xs text-muted-foreground">
          {airspace.isLoading && (
            <p role="status" className="mb-2">
              Loading airspace…
            </p>
          )}
          {airspace.error && !airspace.isLoading && (
            <Alert variant="destructive" className="mb-2">
              <AlertCircle />
              <AlertTitle>Airspace unavailable</AlertTitle>
              <AlertDescription>
                <p>Airspace could not be loaded. Check your connection and try again.</p>
                <Button variant="outline" size="sm" onClick={airspace.retry}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <p>
            Airspace data is provided without warranty and is not to be construed as constituting
            part of the official AIP. Always verify current airspace information before flight.{' '}
            Thanks to{' '}
            <a
              href="https://gliding.co.nz/pilots/pilot-resources/airspace-files/"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground"
            >
              Dave Dennison
            </a>
            .
          </p>
        </footer>
      )}
      <Outlet />
    </div>
  );
}
