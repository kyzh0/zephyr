import type { HistoricalStationData, StationData } from '@/models/station-data.model';
import type { NewStation, Station } from '@/models/station.model';
import { getKeyQueryThrowIfInvalid, throwIfNotOk } from './api-error';

export async function getStationById(id: string): Promise<Station> {
  const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/stations/${id}`);
  await throwIfNotOk(res);
  return (await res.json()) as Station;
}

export async function listStations(includeDisabled: boolean): Promise<Station[]> {
  let url = `${import.meta.env.VITE_API_PREFIX}/stations`;
  if (includeDisabled) {
    url += '?includeDisabled=true';
  }
  const res = await fetch(url);
  await throwIfNotOk(res);
  return (await res.json()) as Station[];
}

export async function loadStationData(
  id: string,
  isHighResolution: boolean
): Promise<StationData[]> {
  let url = `${import.meta.env.VITE_API_PREFIX}/stations/${id}/data`;
  if (isHighResolution) {
    url += '?hr=true';
  }
  const res = await fetch(url);
  await throwIfNotOk(res);
  return (await res.json()) as StationData[];
}

export async function loadAllStationDataAtTimestamp(time: Date): Promise<{
  time: string;
  values: HistoricalStationData[];
}> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/stations/data?time=${time.toISOString()}`
  );
  await throwIfNotOk(res);
  return (await res.json()) as {
    time: string;
    values: HistoricalStationData[];
  };
}

export async function addStation(station: NewStation): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/stations?${getKeyQueryThrowIfInvalid()}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(station)
    }
  );
  await throwIfNotOk(res);
}

export async function patchStation(id: string, updates: Partial<Station>): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/stations/${id}?${getKeyQueryThrowIfInvalid()}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }
  );
  await throwIfNotOk(res);
}

export async function deleteStation(id: string): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/stations/${id}?${getKeyQueryThrowIfInvalid()}`,
    {
      method: 'DELETE'
    }
  );
  await throwIfNotOk(res);
}
