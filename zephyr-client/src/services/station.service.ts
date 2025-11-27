import type { IStationData } from "@/models/station-data.model";
import type { INewStation, IStation } from "@/models/station.model";

export async function getStationById(id: string) {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_PREFIX}/stations/${id}`
    );
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
      url += "?includeDisabled=true";
    }
    const res = await fetch(url);
    const data = await res.json();
    return data as IStation[];
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
    let url = `${
      import.meta.env.VITE_API_PREFIX
    }/stations?unixTimeFrom=${unixTime}`;
    if (lat && lon && radius && !isNaN(lat) && !isNaN(lon) && !isNaN(radius)) {
      url += `&lat=${lat}&lon=${lon}&radius=${radius}`;
    }
    const res = await fetch(url);
    const data = await res.json();
    return data as IStation[];
  } catch (error) {
    console.error(error);
  }
}

export async function listStationsWithinRadius(
  lat: number,
  lon: number,
  radius: number
) {
  try {
    const res = await fetch(
      `${
        import.meta.env.VITE_API_PREFIX
      }/stations?lat=${lat}&lon=${lon}&radius=${radius}`
    );
    const data = await res.json();
    return data as IStation[];
  } catch (error) {
    console.error(error);
  }
}

export async function listStationsWithErrors() {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_PREFIX}/stations?err=${true}`
    );
    const data = await res.json();
    return data as IStation[];
  } catch (error) {
    console.error(error);
  }
}

export async function loadStationData(id: string, isHighResolution: boolean) {
  try {
    let url = `${import.meta.env.VITE_API_PREFIX}/stations/${id}/data`;
    if (isHighResolution) {
      url += "?hr=true";
    }
    const res = await fetch(url);
    const data = await res.json();
    return data as IStationData;
  } catch (error) {
    console.error(error);
  }
}

export async function loadAllStationDataAtTimestamp(time: Date) {
  try {
    const res = await fetch(
      `${
        import.meta.env.VITE_API_PREFIX
      }/stations/data?time=${time.toISOString()}`
    );
    const data = await res.json();
    return data as IStationData[];
  } catch (error) {
    console.error(error);
  }
}

export async function addStation(station: INewStation) {
  try {
    const key = localStorage.getItem("adminKey") ?? "";
    const res = await fetch(
      `${import.meta.env.VITE_API_PREFIX}/stations?key=${key}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(station),
      }
    );
    const data = await res.json();
    return data as IStation;
  } catch (error) {
    console.error(error);
  }
}

export async function patchStation(
  id: string,
  updates: Partial<IStation>,
  key: string
) {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_PREFIX}/stations/${id}?key=${key}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      }
    );
    const data = await res.json();
    return data as IStation;
  } catch (error) {
    console.error(error);
  }
}
