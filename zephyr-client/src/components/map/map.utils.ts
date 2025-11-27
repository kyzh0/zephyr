import type { IStation } from "@/models/station.model";
import type { ICam } from "@/models/cam.model";
import type { ISounding } from "@/models/sounding.model";
import type { GeoJson, GeoJsonFeature, WindUnit } from "./map.types";
import { getArrowStyleSvg } from "./wind-icon.utils";

// localStorage helpers
export function getStoredValue<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return defaultValue;
    return JSON.parse(stored) as T;
  } catch {
    return defaultValue;
  }
}

export function setStoredValue<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
}

// Wind speed conversion
export function convertWindSpeed(speed: number, unit: WindUnit): number {
  return Math.round(unit === "kt" ? speed / 1.852 : speed);
}

// Arrow styling based on wind conditions - uses SVG data URLs instead of PNGs
export function getArrowStyle(
  avgWind: number | null,
  currentBearing: number | null,
  validBearings: string | null,
  isOffline: boolean | null
): [string, string] {
  return getArrowStyleSvg(avgWind, currentBearing, validBearings, isOffline);
}

// GeoJSON generators
export function getStationGeoJson(
  stations: IStation[] | undefined
): GeoJson | null {
  if (!stations || !stations.length) {
    return null;
  }

  const geoJson: GeoJson = {
    type: "FeatureCollection",
    features: [],
  };

  for (const station of stations) {
    let avg = station.currentAverage == null ? null : station.currentAverage;
    const gust = station.currentGust == null ? null : station.currentGust;
    if (avg == null && gust != null) {
      avg = gust;
    }

    const feature: GeoJsonFeature = {
      type: "Feature",
      properties: {
        name: station.name,
        dbId: (station as IStation & { _id: string })._id,
        elevation: station.elevation,
        currentAverage: avg,
        currentGust: gust,
        currentBearing:
          station.currentBearing == null
            ? null
            : Math.round(station.currentBearing),
        validBearings: station.validBearings,
        isOffline: station.isOffline,
      },
      geometry: station.location as {
        type: string;
        coordinates: [number, number];
      },
    };

    // CWU stations sometimes show avg=0 even when gust is high
    if (
      station.type === "cwu" &&
      avg === 0 &&
      gust !== null &&
      gust - avg > 5
    ) {
      feature.properties.currentAverage = gust;
    }

    geoJson.features.push(feature);
  }

  return geoJson;
}

export function getWebcamGeoJson(webcams: ICam[] | undefined): GeoJson | null {
  if (!webcams || !webcams.length) {
    return null;
  }

  const geoJson: GeoJson = {
    type: "FeatureCollection",
    features: [],
  };

  for (const cam of webcams) {
    const feature: GeoJsonFeature = {
      type: "Feature",
      properties: {
        name: cam.name,
        dbId: (cam as ICam & { _id: string })._id,
        currentTime: new Date(cam.currentTime),
        currentUrl: cam.currentUrl,
      },
      geometry: cam.location as {
        type: string;
        coordinates: [number, number];
      },
    };
    geoJson.features.push(feature);
  }

  return geoJson;
}

export function getSoundingGeoJson(
  soundings: ISounding[] | undefined
): GeoJson | null {
  if (!soundings || !soundings.length) {
    return null;
  }

  const geoJson: GeoJson = {
    type: "FeatureCollection",
    features: [],
  };

  for (const s of soundings) {
    s.images.sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );
    const afterDates = s.images.filter(
      (img) => new Date(img.time).getTime() - (Date.now() - 30 * 60 * 1000) > 0
    );

    let url = "";
    let time: Date | null = null;
    if (afterDates && afterDates.length) {
      url = afterDates[0].url;
      time = new Date(afterDates[0].time);
    }

    const feature: GeoJsonFeature = {
      type: "Feature",
      properties: {
        name: s.name,
        dbId: (s as ISounding & { _id: string })._id,
        currentTime: time,
        currentUrl: url,
      },
      geometry: s.location as { type: string; coordinates: [number, number] },
    };
    geoJson.features.push(feature);
  }

  return geoJson;
}

// Sort stations for rendering order
export function sortStationFeatures(features: GeoJsonFeature[]): void {
  features.sort((a, b) => {
    // Render offline stations on bottom
    if (a.properties.isOffline && !b.properties.isOffline) {
      return -1;
    } else if (!a.properties.isOffline && b.properties.isOffline) {
      return 1;
    }

    // Render stations with no data on bottom
    if (
      a.properties.currentAverage == null &&
      b.properties.currentAverage != null
    ) {
      return -1;
    } else if (
      a.properties.currentAverage != null &&
      b.properties.currentAverage == null
    ) {
      return 1;
    }

    // Render stations with valid bearings on top
    if (!a.properties.validBearings && b.properties.validBearings) {
      return -1;
    } else if (a.properties.validBearings && !b.properties.validBearings) {
      return 1;
    }

    // Render stations with higher reading on top
    return (
      (a.properties.currentAverage as number) -
      (b.properties.currentAverage as number)
    );
  });
}

// Calculate history time from offset
export function getHistoryTime(offset: number): Date {
  const t = new Date();
  return new Date(
    t.getTime() -
      ((t.getMinutes() % 30) - offset) * 60 * 1000 -
      t.getSeconds() * 1000 -
      t.getMilliseconds()
  );
}
