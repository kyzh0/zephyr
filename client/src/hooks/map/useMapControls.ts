import { useCallback, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { usePersistedState } from '@/hooks';
import {
  ELEVATION_FILTER_MIN,
  ELEVATION_FILTER_MAX,
  type MapControlsState,
  type MapOverlay,
  type SearchResult,
  type WindUnit
} from '@/components/map/map.types';

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
  flyingMode: boolean;
  // historyOffset is owned by Map.tsx so marker hooks can read it reactively
  historyOffset: number;
  setHistoryOffset: Dispatch<SetStateAction<number>>;
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
  flyingMode,
  historyOffset,
  setHistoryOffset,
  setLandingTransparent,
  setStationMarkersInteractive,
  setSiteDirectionFilter,
  renderHistoricalData,
  renderCurrentData
}: UseMapControlsParams): MapControlsState {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = usePersistedState<'stations' | 'sites'>('viewMode', 'stations');
  const [unit, setUnit] = usePersistedState<WindUnit>('unit', 'kmh');
  const [isSatellite, setIsSatellite] = useState(false);
  const [stationElevationFilter, setStationElevationFilter] = useState<[number, number]>([
    ELEVATION_FILTER_MIN,
    ELEVATION_FILTER_MAX
  ]);
  const [minimizeRecents, setMinimizeRecents] = usePersistedState('minimizeRecents', true);
  const [selectedSiteDirection, setSelectedSiteDirection] = useState<number | null>(null);

  const historyFetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isHistoricData = historyOffset < 0;

  const [overlay, setOverlay] = usePersistedState<MapOverlay>('overlay', null);

  const onWebcamClick = useCallback(() => {
    setOverlay((prev) => (prev === 'webcams' ? null : 'webcams'));
  }, [setOverlay]);

  const onSoundingClick = useCallback(() => {
    setOverlay((prev) => (prev === 'soundings' ? null : 'soundings'));
  }, [setOverlay]);

  const onLayerToggle = useCallback(() => {
    if (!map.current) return;
    const newValue = !isSatellite;
    setIsSatellite(newValue);
    map.current.setStyle(
      newValue
        ? 'mapbox://styles/mapbox/satellite-streets-v11'
        : 'mapbox://styles/mapbox/outdoors-v11'
    );
  }, [isSatellite, map]);

  const onUnitToggle = useCallback(() => {
    const newUnit: WindUnit = unit === 'kmh' ? 'kt' : 'kmh';
    setUnit(newUnit);
    toast.info(`Switched to ${newUnit === 'kmh' ? 'km/h' : 'knots'}`);
  }, [unit, setUnit]);

  const onHistoryChange = useCallback(
    async (offset: number) => {
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
      historyOffset,
      setHistoryOffset,
      setOverlay,
      setStationMarkersInteractive,
      renderHistoricalData,
      renderCurrentData
    ]
  );

  const onRecentsToggle = useCallback(() => {
    setMinimizeRecents((prev) => !prev);
  }, [setMinimizeRecents]);

  const onSiteDirectionFilterChange = useCallback(
    (bearing: number | null) => {
      setSelectedSiteDirection(bearing);
      setSiteDirectionFilter(bearing);
      setLandingTransparent(!!bearing);
    },
    [setSiteDirectionFilter, setLandingTransparent]
  );

  const onToggleViewMode = useCallback(
    (mode: 'stations' | 'sites') => {
      setViewMode(mode);
    },
    [setViewMode]
  );

  const onSearchSelect = useCallback(
    (result: SearchResult) => {
      if (result.item.location?.coordinates) {
        flyTo(result.item.location.coordinates);
      }
      if (result.type === 'station') {
        onToggleViewMode('stations');
        navigate(`/stations/${result.item._id}`);
      } else if (result.type === 'site') {
        onToggleViewMode('sites');
        navigate(`/sites/${result.item._id}`);
      } else if (result.type === 'landing') {
        onToggleViewMode('sites');
        navigate(`/landings/${result.item._id}`);
      } else if (result.type === 'webcam') {
        setOverlay('webcams');
        navigate(`/webcams/${result.item._id}`);
      } else {
        setOverlay('soundings');
        navigate(`/soundings/${result.item._id}`);
      }
    },
    [flyTo, navigate, onToggleViewMode, setOverlay]
  );

  return {
    overlay,
    viewMode,
    unit,
    stationElevationFilter,
    historyOffset,
    isHistoricData,
    // flyingMode forces recents to be minimised; respects user toggle otherwise
    minimizeRecents: flyingMode ? true : minimizeRecents,
    siteDirectionFilter: selectedSiteDirection,
    onWebcamClick,
    onSoundingClick,
    onLayerToggle,
    onLocateClick: triggerGeolocate,
    onUnitToggle,
    onHistoryChange,
    onStationElevationFilterChange: setStationElevationFilter,
    onRecentsToggle,
    onToggleViewMode,
    onSiteDirectionFilterChange,
    onSearchSelect
  };
}
