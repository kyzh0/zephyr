import { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { useMapStore } from '@/store';
import { MAP_OVERLAYS, MAP_VIEW_MODES } from '@/components/map/map.types';
import type { MapControlHandlers, SearchResult } from '@/components/map/map.types';

function getSnapshotTime(offset: number): Date {
  const now = new Date();
  const minutesPast30 = now.getMinutes() % 30;
  return new Date(
    now.getTime() -
      (minutesPast30 - offset) * 60 * 1000 -
      now.getSeconds() * 1000 -
      now.getMilliseconds()
  );
}

export interface UseMapControlsParams {
  map: React.RefObject<{ setStyle: (style: string) => void } | null>;
  triggerGeolocate: () => Promise<void>;
  flyTo: (coordinates: [number, number]) => void;
  setLandingTransparent: (visible: boolean) => void;
  setStationMarkersInteractive: (interactive: boolean) => void;
  setSiteDirectionFilter: (bearing: number | null) => void;
  renderHistoricalData: ((time: Date) => Promise<void>) | undefined;
  renderCurrentData: (() => Promise<void>) | undefined;
}

export function useMapControls({
  map,
  triggerGeolocate,
  flyTo,
  setLandingTransparent,
  setStationMarkersInteractive,
  setSiteDirectionFilter,
  renderHistoricalData,
  renderCurrentData
}: UseMapControlsParams): MapControlHandlers {
  const navigate = useNavigate();
  const setOverlay = useMapStore((s) => s.setOverlay);
  const setViewMode = useMapStore((s) => s.setViewMode);
  const setHistoryOffset = useMapStore((s) => s.setHistoryOffset);
  const setSelectedSiteDirection = useMapStore((s) => s.setSelectedSiteDirection);

  const historyFetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onLayerToggle = useCallback(() => {
    if (!map.current) return;
    const { isSatellite, setIsSatellite } = useMapStore.getState();
    const newValue = !isSatellite;
    setIsSatellite(newValue);
    map.current.setStyle(
      newValue
        ? 'mapbox://styles/mapbox/satellite-streets-v11'
        : 'mapbox://styles/mapbox/outdoors-v11'
    );
  }, [map]);

  const onHistoryChange = useCallback(
    async (offset: number) => {
      const historyOffset = useMapStore.getState().historyOffset;
      const enteringHistoryMode = offset < 0 && historyOffset === 0;
      const exitingHistoryMode = offset === 0 && historyOffset < 0;

      if (enteringHistoryMode) {
        setOverlay(null);
        setStationMarkersInteractive(false);
      } else if (exitingHistoryMode) {
        setStationMarkersInteractive(true);
      }

      setHistoryOffset(offset);

      if (offset < 0) {
        if (historyFetchTimeoutRef.current) {
          clearTimeout(historyFetchTimeoutRef.current);
          historyFetchTimeoutRef.current = null;
        }
        const snapshotTime = getSnapshotTime(offset);
        historyFetchTimeoutRef.current = setTimeout(() => {
          historyFetchTimeoutRef.current = null;
          void renderHistoricalData?.(snapshotTime);
        }, 100);
      } else {
        if (historyFetchTimeoutRef.current) {
          clearTimeout(historyFetchTimeoutRef.current);
          historyFetchTimeoutRef.current = null;
        }
        await renderCurrentData?.();
      }
    },
    [
      setHistoryOffset,
      setOverlay,
      setStationMarkersInteractive,
      renderHistoricalData,
      renderCurrentData
    ]
  );

  const onSiteDirectionFilterChange = useCallback(
    (bearing: number | null) => {
      setSelectedSiteDirection(bearing);
      setSiteDirectionFilter(bearing);
      setLandingTransparent(!!bearing);
    },
    [setSelectedSiteDirection, setSiteDirectionFilter, setLandingTransparent]
  );

  const onSearchSelect = useCallback(
    (result: SearchResult) => {
      if (result.item.location?.coordinates) {
        flyTo(result.item.location.coordinates);
      }
      if (result.type === 'station') {
        setViewMode(MAP_VIEW_MODES.STATIONS);
        navigate(`/stations/${result.item._id}`);
      } else if (result.type === 'site') {
        setViewMode(MAP_VIEW_MODES.SITES);
        navigate(`/sites/${result.item._id}`);
      } else if (result.type === 'landing') {
        setViewMode(MAP_VIEW_MODES.SITES);
        navigate(`/landings/${result.item._id}`);
      } else if (result.type === 'webcam') {
        setOverlay(MAP_OVERLAYS.WEBCAMS);
        navigate(`/webcams/${result.item._id}`);
      } else {
        setOverlay(MAP_OVERLAYS.SOUNDINGS);
        navigate(`/soundings/${result.item._id}`);
      }
    },
    [flyTo, navigate, setViewMode, setOverlay]
  );

  return {
    onLayerToggle,
    onLocateClick: triggerGeolocate,
    onHistoryChange,
    onSiteDirectionFilterChange,
    onSearchSelect
  };
}
