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
  // initialOverlay seeds the overlay useState; subsequent changes are handled imperatively
  initialOverlay: MapOverlay;
  // Marker operations
  setWebcamVisibility: (visible: boolean) => void;
  setSoundingVisibility: (visible: boolean) => void;
  setSiteVisibility: (visible: boolean) => void;
  setStationVisibility: (visible: boolean) => void;
  setStationMarkersInteractive: (interactive: boolean) => void;
  setWindFilter: (bearing: number | null) => void;
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
  initialOverlay,
  setWebcamVisibility,
  setSoundingVisibility,
  setSiteVisibility,
  setStationVisibility,
  setStationMarkersInteractive,
  setWindFilter,
  refreshWebcams,
  refreshSoundings,
  renderHistoricalData,
  renderCurrentData
}: UseMapControlsParams): MapControlsState {
  const [overlay, setOverlay] = useState<MapOverlay>(initialOverlay);
  const [viewMode, setViewMode] = useState<'stations' | 'sites'>(() =>
    getStoredValue<'stations' | 'sites'>('viewMode', 'stations')
  );
  const [unit, setUnit] = useState<WindUnit>(() => getStoredValue<WindUnit>('unit', 'kmh'));
  const [isSatellite, setIsSatellite] = useState(false);
  const [elevationFilter, setElevationFilter] = useState(0);
  const [minimizeRecents, setMinimizeRecents] = useState(() =>
    getStoredValue('minimizeRecents', true)
  );
  const [windBearing, setWindBearing] = useState<number | null>(null);

  const historyFetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isHistoricData = historyOffset < 0;

  const onWebcamClick = useCallback(async () => {
    const newOverlay: MapOverlay = overlay === 'webcams' ? null : 'webcams';
    setOverlay(newOverlay);
    setStoredValue('showWebcams', newOverlay === 'webcams');
    setStoredValue('showSoundings', false);
    setWebcamVisibility(newOverlay === 'webcams');
    setSoundingVisibility(false);
    if (newOverlay === 'webcams') await refreshWebcams();
  }, [overlay, setWebcamVisibility, setSoundingVisibility, refreshWebcams]);

  const onSoundingClick = useCallback(async () => {
    const newOverlay: MapOverlay = overlay === 'soundings' ? null : 'soundings';
    setOverlay(newOverlay);
    setStoredValue('showSoundings', newOverlay === 'soundings');
    setStoredValue('showWebcams', false);
    setSoundingVisibility(newOverlay === 'soundings');
    setWebcamVisibility(false);
    if (newOverlay === 'soundings') await refreshSoundings();
  }, [overlay, setSoundingVisibility, setWebcamVisibility, refreshSoundings]);

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
        setWebcamVisibility(false);
        setSoundingVisibility(false);
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
      setWebcamVisibility,
      setSoundingVisibility,
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

  const onWindBearingChange = useCallback(
    (bearing: number | null) => {
      setWindBearing(bearing);
      setWindFilter(bearing);
    },
    [setWindFilter]
  );

  const onToggleViewMode = useCallback(
    (mode: 'stations' | 'sites') => {
      setViewMode(mode);
      setStoredValue('viewMode', mode);
      setSiteVisibility(mode === 'sites');
      setStationVisibility(mode === 'stations');
      if (mode !== 'sites') {
        setWindBearing(null);
        setWindFilter(null);
      }
    },
    [setSiteVisibility, setStationVisibility, setWindFilter]
  );

  return {
    overlay,
    viewMode,
    unit,
    elevationFilter,
    historyOffset,
    isHistoricData,
    // flyingMode forces recents to be minimised; respects user toggle otherwise
    minimizeRecents: flyingMode ? true : minimizeRecents,
    windBearing,
    onWebcamClick,
    onSoundingClick,
    onLayerToggle,
    onLocateClick: triggerGeolocate,
    onUnitToggle,
    onHistoryChange,
    onElevationChange: setElevationFilter,
    onRecentsToggle,
    onToggleViewMode,
    onWindBearingChange
  };
}
