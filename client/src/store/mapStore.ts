import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  ELEVATION_FILTER_MIN,
  ELEVATION_FILTER_MAX,
  MAP_OVERLAYS,
  MAP_VIEW_MODES,
  WIND_UNITS,
  type MapOverlay,
  type MapViewMode,
  type WindUnit
} from '@/components/map';

const VALID_OVERLAYS = new Set<string>(Object.values(MAP_OVERLAYS));
const VALID_UNITS = new Set<string>(Object.values(WIND_UNITS));
const VALID_VIEW_MODES = new Set<string>(Object.values(MAP_VIEW_MODES));

const DEPRECATED_KEYS = [
  'showStations',
  'showWebcams',
  'showSoundings',
  'showSites',
  'showWelcome'
];

interface MapStore {
  // Persisted UI preferences
  overlay: MapOverlay;
  unit: WindUnit;
  viewMode: MapViewMode;
  minimizeRecents: boolean;
  isSatellite: boolean;
  // Ephemeral session state
  historyOffset: number;
  stationElevationFilter: [number, number];
  selectedSiteDirection: number | null;
  // Actions
  setOverlay: (overlay: MapOverlay) => void;
  toggleWebcams: () => void;
  toggleSoundings: () => void;
  setUnit: (unit: WindUnit) => void;
  setViewMode: (mode: MapViewMode) => void;
  toggleMinimizeRecents: () => void;
  setIsSatellite: (value: boolean) => void;
  setHistoryOffset: (offset: number) => void;
  setStationElevationFilter: (filter: [number, number]) => void;
  setSelectedSiteDirection: (bearing: number | null) => void;
}

export const useMapStore = create<MapStore>()(
  persist(
    (set, get) => ({
      overlay: null,
      unit: WIND_UNITS.KMH,
      viewMode: MAP_VIEW_MODES.STATIONS,
      minimizeRecents: true,
      isSatellite: false,
      historyOffset: 0,
      stationElevationFilter: [ELEVATION_FILTER_MIN, ELEVATION_FILTER_MAX],
      selectedSiteDirection: null,
      setOverlay: (overlay) => set({ overlay }),
      toggleWebcams: () =>
        set({ overlay: get().overlay === MAP_OVERLAYS.WEBCAMS ? null : MAP_OVERLAYS.WEBCAMS }),
      toggleSoundings: () =>
        set({ overlay: get().overlay === MAP_OVERLAYS.SOUNDINGS ? null : MAP_OVERLAYS.SOUNDINGS }),
      setUnit: (unit) => set({ unit }),
      setViewMode: (viewMode) => set({ viewMode }),
      toggleMinimizeRecents: () => set({ minimizeRecents: !get().minimizeRecents }),
      setIsSatellite: (isSatellite) => set({ isSatellite }),
      setHistoryOffset: (historyOffset) => set({ historyOffset }),
      setStationElevationFilter: (stationElevationFilter) => set({ stationElevationFilter }),
      setSelectedSiteDirection: (selectedSiteDirection) => set({ selectedSiteDirection })
    }),
    {
      name: 'zephyr-map',
      version: 1,
      partialize: (state) => ({
        overlay: state.overlay,
        unit: state.unit,
        viewMode: state.viewMode,
        minimizeRecents: state.minimizeRecents,
        isSatellite: state.isSatellite
      }),
      onRehydrateStorage: () => {
        const hadExistingStore = localStorage.getItem('zephyr-map') !== null;
        return (hydratedState: MapStore | undefined, error: unknown) => {
          if (error || !hydratedState) return;

          // Discard any persisted value that no longer matches a known constant
          if (hydratedState.overlay !== null && !VALID_OVERLAYS.has(hydratedState.overlay)) {
            useMapStore.setState({ overlay: null });
          }
          if (!VALID_UNITS.has(hydratedState.unit)) {
            useMapStore.setState({ unit: WIND_UNITS.KMH });
          }
          if (!VALID_VIEW_MODES.has(hydratedState.viewMode)) {
            useMapStore.setState({ viewMode: MAP_VIEW_MODES.STATIONS });
          }
          if (typeof hydratedState.isSatellite !== 'boolean') {
            useMapStore.setState({ isSatellite: false });
          }
          if (typeof hydratedState.minimizeRecents !== 'boolean') {
            useMapStore.setState({ minimizeRecents: true });
          }

          if (hadExistingStore) return;

          // One-time migration from old usePersistedState flat keys
          const migrations: (() => void)[] = [
            () => {
              const raw = localStorage.getItem('unit');
              if (raw === null) return;
              try {
                const parsed = JSON.parse(raw) as string;
                if (VALID_UNITS.has(parsed)) useMapStore.setState({ unit: parsed as WindUnit });
              } catch {
                /* malformed, ignore */
              }
              localStorage.removeItem('unit');
            },
            () => {
              const raw = localStorage.getItem('overlay');
              if (raw === null) return;
              try {
                const parsed = JSON.parse(raw) as string | null;
                if (parsed === null || VALID_OVERLAYS.has(parsed))
                  useMapStore.setState({ overlay: parsed as MapOverlay });
              } catch {
                /* malformed, ignore */
              }
              localStorage.removeItem('overlay');
            },
            () => {
              const raw = localStorage.getItem('viewMode');
              if (raw === null) return;
              try {
                const parsed = JSON.parse(raw) as string;
                if (VALID_VIEW_MODES.has(parsed))
                  useMapStore.setState({ viewMode: parsed as MapViewMode });
              } catch {
                /* malformed, ignore */
              }
              localStorage.removeItem('viewMode');
            },
            () => {
              const raw = localStorage.getItem('minimizeRecents');
              if (raw === null) return;
              try {
                const parsed = JSON.parse(raw) as unknown;
                if (typeof parsed === 'boolean') useMapStore.setState({ minimizeRecents: true });
              } catch {
                /* malformed, ignore */
              }
              localStorage.removeItem('minimizeRecents');
            }
          ];
          migrations.forEach((fn) => fn());

          DEPRECATED_KEYS.forEach((key) => localStorage.removeItem(key));
        };
      }
    }
  )
);
