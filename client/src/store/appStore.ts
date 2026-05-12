import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { SPORTS, type SportType } from '@/components/map';

const VALID_SPORTS = new Set<string>(Object.values(SPORTS));
const MAX_RECENT_STATIONS = 5;
export const MAX_FAVOURITES = 5;
export const MAX_FAVOURITE_LENGTH = 15;

interface RecentStation {
  id: string;
  name: string;
  viewedAt: number;
}

export interface SavedFavourite {
  id: string;
  name: string;
  lat: number;
  lng: number;
  zoom: number;
}

interface AppStore {
  flyingMode: boolean;
  sport: SportType;
  welcomeDismissed: boolean;
  recentStations: RecentStation[];
  favourites: SavedFavourite[];
  toggleFlyingMode: () => void;
  setSport: (sport: SportType) => void;
  setWelcomeDismissed: (value: boolean) => void;
  addRecentStation: (id: string, name: string) => void;
  addSavedFavourite: (id: string, name: string, lat: number, lng: number, zoom: number) => void;
  removeSavedFavourite: (id: string) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      flyingMode: false,
      sport: SPORTS.PARAGLIDING,
      welcomeDismissed: false,
      recentStations: [],
      favourites: [],
      toggleFlyingMode: () => set({ flyingMode: !get().flyingMode }),
      setSport: (sport) => set({ sport }),
      setWelcomeDismissed: (welcomeDismissed) => set({ welcomeDismissed }),
      addRecentStation: (id, name) => {
        const filtered = get().recentStations.filter((s) => s.id !== id);
        set({
          recentStations: [{ id, name, viewedAt: Date.now() }, ...filtered].slice(
            0,
            MAX_RECENT_STATIONS
          )
        });
      },
      addSavedFavourite: (id, name, lat, lng, zoom) => {
        const filtered = get().favourites.filter((s) => s.id !== id);
        set({
          favourites: [...filtered, { id, name, lat, lng, zoom }]
        });
      },
      removeSavedFavourite: (id: string) => {
        const filtered = get().favourites.filter((s) => s.id !== id);
        set({
          favourites: [...filtered]
        });
      }
    }),
    {
      name: 'zephyr-app',
      version: 1,
      partialize: (state) => ({
        flyingMode: state.flyingMode,
        sport: state.sport,
        welcomeDismissed: state.welcomeDismissed,
        recentStations: state.recentStations,
        favourites: state.favourites
      }),
      onRehydrateStorage: () => {
        const hadExistingStore = localStorage.getItem('zephyr-app') !== null;
        return (hydratedState: AppStore | undefined, error: unknown) => {
          if (error || !hydratedState) return;

          // Discard any persisted value that no longer matches the expected shape
          if (typeof hydratedState.flyingMode !== 'boolean') {
            useAppStore.setState({ flyingMode: false });
          }
          if (!VALID_SPORTS.has(hydratedState.sport)) {
            useAppStore.setState({ sport: SPORTS.PARAGLIDING });
          }
          if (typeof hydratedState.welcomeDismissed !== 'boolean') {
            useAppStore.setState({ welcomeDismissed: false });
          }
          if (!Array.isArray(hydratedState.recentStations)) {
            useAppStore.setState({ recentStations: [] });
          }
          if (!Array.isArray(hydratedState.favourites)) {
            useAppStore.setState({ favourites: [] });
          }

          if (hadExistingStore) return;

          // One-time migration from old usePersistedState flat keys
          const oldFlyingMode = localStorage.getItem('flyingMode');
          if (oldFlyingMode !== null) {
            try {
              const parsed = JSON.parse(oldFlyingMode) as unknown;
              if (typeof parsed === 'boolean') useAppStore.setState({ flyingMode: parsed });
            } catch {
              /* malformed, ignore */
            }
            localStorage.removeItem('flyingMode');
          }

          const oldSport = localStorage.getItem('sport');
          if (oldSport !== null) {
            try {
              const parsed = JSON.parse(oldSport) as string;
              if (VALID_SPORTS.has(parsed)) useAppStore.setState({ sport: parsed as SportType });
            } catch {
              /* malformed, ignore */
            }
            localStorage.removeItem('sport');
          }

          // welcomeDismissed was stored as raw string 'true', not JSON
          const oldWelcome = localStorage.getItem('welcomeDismissed');
          if (oldWelcome !== null) {
            useAppStore.setState({ welcomeDismissed: oldWelcome === 'true' });
            localStorage.removeItem('welcomeDismissed');
          }

          // recentStations was stored as JSON under a flat key by recent-stations.service
          const oldRecents = localStorage.getItem('recentStations');
          if (oldRecents !== null) {
            try {
              const parsed = JSON.parse(oldRecents) as unknown;
              if (Array.isArray(parsed)) {
                useAppStore.setState({ recentStations: parsed as RecentStation[] });
              }
            } catch {
              /* malformed, ignore */
            }
            localStorage.removeItem('recentStations');
          }

          // favourites was stored as JSON under a flat key by favourites.service
          const oldFavourites = localStorage.getItem('favourites');
          if (oldFavourites !== null) {
            try {
              const parsed = JSON.parse(oldFavourites) as unknown;
              if (Array.isArray(parsed)) {
                useAppStore.setState({ favourites: parsed as SavedFavourite[] });
              }
            } catch {
              /* malformed, ignore */
            }
            localStorage.removeItem('favourites');
          }
        };
      }
    }
  )
);
