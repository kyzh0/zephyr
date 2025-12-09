import { getStoredValue, setStoredValue } from "@/components/map";

const RECENT_STATIONS_KEY = "recentStations";
const MAX_RECENT_STATIONS = 5;
export const RECENT_STATIONS_UPDATED_EVENT = "recentStationsUpdated";

export interface RecentStation {
  id: string;
  name: string;
  viewedAt: number;
}

/**
 * Get the list of recently viewed stations from local storage
 */
export function getRecentStations(): RecentStation[] {
  return getStoredValue<RecentStation[]>(RECENT_STATIONS_KEY, []);
}

/**
 * Add a station to the recently viewed list
 * - If the station already exists, move it to the top
 * - Keeps only the last 5 stations
 */
export function addRecentStation(id: string, name: string): void {
  const recentStations = getRecentStations();

  // Remove the station if it already exists
  const filtered = recentStations.filter((station) => station.id !== id);

  // Add the new station to the beginning
  const updated: RecentStation[] = [
    { id, name, viewedAt: Date.now() },
    ...filtered,
  ].slice(0, MAX_RECENT_STATIONS);

  setStoredValue(RECENT_STATIONS_KEY, updated);

  // Dispatch custom event to notify listeners
  window.dispatchEvent(new CustomEvent(RECENT_STATIONS_UPDATED_EVENT));
}

/**
 * Clear all recently viewed stations
 */
export function clearRecentStations(): void {
  setStoredValue(RECENT_STATIONS_KEY, []);
}
