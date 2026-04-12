import type { GeoJson, GeoJsonFeature, WindUnit } from './map.types';

import type { Station } from '@/models/station.model';
import type { Webcam } from '@/models/webcam.model';
import type { Sounding } from '@/models/sounding.model';
import type { Site } from '@/models/site.model';
import type { Landing } from '@/models/landing.model';

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
    console.error('Error saving to localStorage:', error);
  }
}

// Wind speed conversion
export function convertWindSpeed(speed: number, unit: WindUnit): number {
  return Math.round(unit === 'kt' ? speed / 1.852 : speed);
}

// GeoJSON generators
export function getStationGeoJson(stations: Station[] | undefined): GeoJson | null {
  if (!stations?.length) {
    return null;
  }

  const geoJson: GeoJson = {
    type: 'FeatureCollection',
    features: []
  };

  for (const station of stations) {
    let avg = station.currentAverage ?? null;
    const gust = station.currentGust ?? null;
    if (avg == null && gust != null) {
      avg = gust;
    }

    const feature: GeoJsonFeature = {
      type: 'Feature',
      properties: {
        name: station.name,
        dbId: station._id,
        elevation: station.elevation,
        currentAverage: avg,
        currentGust: gust,
        currentBearing: station.currentBearing == null ? null : Math.round(station.currentBearing),
        validBearings: station.validBearings,
        isOffline: station.isOffline,
        lastUpdate: station.lastUpdate ?? null
      },
      geometry: station.location as {
        type: string;
        coordinates: [number, number];
      }
    };

    // CWU stations sometimes show avg=0 even when gust is high
    if (station.type === 'cwu' && avg === 0 && gust !== null && gust - avg > 5) {
      feature.properties.currentAverage = gust;
    }

    geoJson.features.push(feature);
  }

  return geoJson;
}

export function getWebcamGeoJson(webcams: Webcam[] | undefined): GeoJson | null {
  if (!webcams?.length) {
    return null;
  }

  const geoJson: GeoJson = {
    type: 'FeatureCollection',
    features: []
  };

  for (const webcam of webcams) {
    const feature: GeoJsonFeature = {
      type: 'Feature',
      properties: {
        name: webcam.name,
        dbId: webcam._id,
        currentTime: new Date(webcam.currentTime),
        currentUrl: webcam.currentUrl
      },
      geometry: webcam.location as {
        type: string;
        coordinates: [number, number];
      }
    };
    geoJson.features.push(feature);
  }

  return geoJson;
}

export function getSoundingGeoJson(soundings: Sounding[] | undefined): GeoJson | null {
  if (!soundings?.length) {
    return null;
  }

  const geoJson: GeoJson = {
    type: 'FeatureCollection',
    features: []
  };

  for (const s of soundings) {
    s.images.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    const afterDates = s.images.filter(
      (img) => new Date(img.time).getTime() - (Date.now() - 30 * 60 * 1000) > 0
    );

    let url = '';
    let time: Date | null = null;
    if (afterDates?.length) {
      url = afterDates[0].url;
      time = new Date(afterDates[0].time);
    }

    const feature: GeoJsonFeature = {
      type: 'Feature',
      properties: {
        name: s.name,
        dbId: (s as Sounding & { _id: string })._id,
        currentTime: time,
        currentUrl: url
      },
      geometry: s.location as { type: string; coordinates: [number, number] }
    };
    geoJson.features.push(feature);
  }

  return geoJson;
}

export function getSiteGeoJson(sites: Site[] | undefined): GeoJson | null {
  if (!sites?.length) {
    return null;
  }

  const geoJson: GeoJson = {
    type: 'FeatureCollection',
    features: []
  };

  for (const site of sites) {
    // Skip disabled sites
    if (site.isDisabled) continue;

    const feature: GeoJsonFeature = {
      type: 'Feature',
      properties: {
        name: site.name,
        dbId: site._id,
        validBearings: site.validBearings,
        siteGuideUrl: site.siteGuideUrl
      },
      geometry: site.location as {
        type: string;
        coordinates: [number, number];
      }
    };
    geoJson.features.push(feature);
  }

  return geoJson;
}

export function getLandingGeoJson(landings: Landing[] | undefined): GeoJson | null {
  if (!landings?.length) {
    return null;
  }

  const geoJson: GeoJson = {
    type: 'FeatureCollection',
    features: []
  };

  for (const landing of landings) {
    // Skip disabled landings
    if (landing.isDisabled) continue;

    const feature: GeoJsonFeature = {
      type: 'Feature',
      properties: {
        name: landing.name,
        dbId: landing._id,
        siteGuideUrl: landing.siteGuideUrl
      },
      geometry: landing.location as {
        type: string;
        coordinates: [number, number];
      }
    };
    geoJson.features.push(feature);
  }

  return geoJson;
}

export const POPUP_OFFSET: Record<string, [number, number]> = {
  top: [0, 20],
  'top-left': [15, 20],
  'top-right': [-15, 20],
  bottom: [0, -20],
  'bottom-left': [15, -20],
  'bottom-right': [-15, -20],
  left: [20, 0],
  right: [-20, 0]
};

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
