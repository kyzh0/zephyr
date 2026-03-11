import { useCallback, useRef, useState } from 'react';
import type { RefObject, Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';
import { getStoredValue, setStoredValue } from '@/components/map/map.utils';
import type { MapControlsState, MapOverlay, WindUnit } from '@/components/map/map.types';

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
  map: RefObject<{ setStyle: (style: string) => void } | null>;
  triggerGeolocate: () => Promise<void>;
  flyingMode: boolean;
  // historyOffset is owned by Map.tsx so marker hooks can read it reactively
  historyOffset: number;
  setHistoryOffset: Dispatch<SetStateAction<number>>;
  setLandingTransparent: (visible: boolean) => void;
  setStationMarkersInteractive: (interactive: boolean) => void;
  setSiteDirectionFilter: (bearing: number | null) => void;
  refreshWebcams: () => Promise<void>;
  refreshSoundings: () => Promise<void>;
  renderHistoricalData: ((time: Date) => Promise<void>) | undefined;
  renderCurrentData: (() => Promise<void>) | undefined;
}

export function useMapControls({
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
}: UseMapControlsParams): MapControlsState {
  const [viewMode, setViewMode] = useState<'stations' | 'sites'>(() =>
    getStoredValue<'stations' | 'sites'>('viewMode', 'stations')
  );
  const [unit, setUnit] = useState<WindUnit>(() => getStoredValue<WindUnit>('unit', 'kmh'));
  const [isSatellite, setIsSatellite] = useState(false);
  const [stationElevationFilter, setStationElevationFilter] = useState(0);
  const [minimizeRecents, setMinimizeRecents] = useState(() =>
    getStoredValue('minimizeRecents', true)
  );
  const [selectedSiteDirection, setSelectedSiteDirection] = useState<number | null>(null);

  const historyFetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isHistoricData = historyOffset < 0;

  const [overlay, setOverlay] = useState<MapOverlay>(() => {
    if (getStoredValue('showWebcams', false)) return 'webcams';
    if (getStoredValue('showSoundings', false)) return 'soundings';
    return null;
  });

  const onWebcamClick = useCallback(async () => {
    const newOverlay: MapOverlay = overlay === 'webcams' ? null : 'webcams';
    setOverlay(newOverlay);
    setStoredValue('showWebcams', newOverlay === 'webcams');
    setStoredValue('showSoundings', false);
    if (newOverlay === 'webcams') await refreshWebcams();
  }, [overlay, setOverlay, refreshWebcams]);

  const onSoundingClick = useCallback(async () => {
    const newOverlay: MapOverlay = overlay === 'soundings' ? null : 'soundings';
    setOverlay(newOverlay);
    setStoredValue('showSoundings', newOverlay === 'soundings');
    setStoredValue('showWebcams', false);
    if (newOverlay === 'soundings') await refreshSoundings();
  }, [overlay, setOverlay, refreshSoundings]);

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
    setStoredValue('unit', newUnit);
    toast.info(`Switched to ${newUnit === 'kmh' ? 'km/h' : 'knots'}`);
  }, [unit]);

  const onHistoryChange = useCallback(
    async (offset: number) => {
      const enteringHistoryMode = offset < 0 && historyOffset === 0;
      const exitingHistoryMode = offset === 0 && historyOffset < 0;

      if (enteringHistoryMode) {
        setOverlay(null);
        setStoredValue('showWebcams', false);
        setStoredValue('showSoundings', false);
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
    const newValue = !minimizeRecents;
    setMinimizeRecents(newValue);
    setStoredValue('minimizeRecents', newValue);
  }, [minimizeRecents]);

  const onSiteDirectionFilterChange = useCallback(
    (bearing: number | null) => {
      setSelectedSiteDirection(bearing);
      setSiteDirectionFilter(bearing);
      setLandingTransparent(!!bearing);
    },
    [setSiteDirectionFilter, setLandingTransparent]
  );

  const onToggleViewMode = useCallback((mode: 'stations' | 'sites') => {
    // Visibility is controlled by localstorage
    setViewMode(mode);
    setStoredValue('viewMode', mode);
  }, []);

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
    onSiteDirectionFilterChange
  };
}
