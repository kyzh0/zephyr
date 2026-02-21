import type { IHistoricalStationData, IStationData } from '@/models/station-data.model';
import type { INewStation, IStation } from '@/models/station.model';

export async function getStationById(id: string) {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/stations/${id}`);
    const data = (await res.json()) as IStation;
    return data;
  } catch (error) {
    console.error(error);
  }
}

export async function listStations(includeDisabled: boolean) {
  try {
    let url = `${import.meta.env.VITE_API_PREFIX}/stations`;
    if (includeDisabled) {
      url += '?includeDisabled=true';
    }
    const res = await fetch(url);
    return (await res.json()) as IStation[];
  } catch (error) {
    console.error(error);
  }
}

export async function listStationsUpdatedSince(
  unixTime: number,
  lat?: number,
  lon?: number,
  radius?: number
) {
  try {
    let url = `${import.meta.env.VITE_API_PREFIX}/stations?unixTimeFrom=${unixTime}`;
    if (lat && lon && radius && !isNaN(lat) && !isNaN(lon) && !isNaN(radius)) {
      url += `&lat=${lat}&lon=${lon}&radius=${radius}`;
    }
    const res = await fetch(url);
    return (await res.json()) as IStation[];
  } catch (error) {
    console.error(error);
  }
}

export async function listStationsWithinRadius(lat: number, lon: number, radius: number) {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_PREFIX}/stations?lat=${lat}&lon=${lon}&radius=${radius}`
    );
    return (await res.json()) as IStation[];
  } catch (error) {
    console.error(error);
  }
}

export async function loadStationData(id: string, isHighResolution: boolean) {
  try {
    let url = `${import.meta.env.VITE_API_PREFIX}/stations/${id}/data`;
    if (isHighResolution) {
      url += '?hr=true';
    }
    const res = await fetch(url);
    return (await res.json()) as IStationData;
  } catch (error) {
    console.error(error);
  }
}

export async function loadAllStationDataAtTimestamp(time: Date) {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_PREFIX}/stations/data?time=${time.toISOString()}`
    );
    return (await res.json()) as {
      time: string;
      values: IHistoricalStationData[];
    };
  } catch (error) {
    console.error(error);
  }
}

export async function addStation(station: INewStation) {
  try {
    const key = sessionStorage.getItem('adminKey') ?? '';
    const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/stations?key=${key}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(station)
    });
    return (await res.json()) as IStation;
  } catch (error) {
    console.error(error);
  }
}

export async function patchStation(id: string, updates: Partial<IStation>, key: string) {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/stations/${id}?key=${key}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    return (await res.json()) as IStation;
  } catch (error) {
    console.error(error);
  }
}

export async function deleteStation(id: string, key: string) {
  const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/stations/${id}?key=${key}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    throw new Error(res.statusText);
  }
}
