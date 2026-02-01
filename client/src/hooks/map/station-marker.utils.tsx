import type { WindUnit } from '@/components/map';

// Elevation thresholds for border segments (in meters)
const ELEVATION_THRESHOLDS = [250, 500, 750, 1000, 1250, 1500] as const;
const ELEVATION_SEGMENT_SIZE = 30;
const ELEVATION_ROTATION_OFFSET = 127;

export interface StationProperties {
  dbId: string;
  name: string;
  elevation: number;
  currentAverage: number | null;
  currentGust: number | null;
  currentBearing: number | null;
  validBearings: string | null;
  isOffline: boolean | null;
}

/**
 * Extract station properties from GeoJSON feature with proper typing
 */
export function extractStationProperties(properties: Record<string, unknown>): StationProperties {
  return {
    dbId: properties.dbId as string,
    name: properties.name as string,
    elevation: properties.elevation as number,
    currentAverage: properties.currentAverage as number | null,
    currentGust: properties.currentGust as number | null,
    currentBearing: properties.currentBearing as number | null,
    validBearings: properties.validBearings as string | null,
    isOffline: properties.isOffline as boolean | null
  };
}

/**
 * Format wind speed display text
 */
export function formatWindDisplay(
  avg: number | null,
  gust: number | null,
  unit: WindUnit,
  convertFn: (speed: number, unit: WindUnit) => number
): string {
  if (avg == null && gust == null) return '-';

  const unitLabel = unit === 'kt' ? 'kt' : 'km/h';

  if (avg == null) return '-';

  const avgDisplay = convertFn(avg, unit);
  if (gust != null) {
    const gustDisplay = convertFn(gust, unit);
    return `${avgDisplay} - ${gustDisplay} ${unitLabel}`;
  }
  return `${avgDisplay} ${unitLabel}`;
}

/**
 * Format marker text (just the number or status)
 */
export function formatMarkerText(
  avg: number | null,
  isOffline: boolean | null,
  unit: WindUnit,
  convertFn: (speed: number, unit: WindUnit) => number
): string {
  if (isOffline) return 'X';
  if (avg == null) return '-';
  return String(convertFn(avg, unit));
}

/**
 * Calculate elevation border dash array
 */
export function getElevationDashArray(elevation: number): string {
  const segments = ELEVATION_THRESHOLDS.map((threshold) =>
    elevation >= threshold ? ELEVATION_SEGMENT_SIZE : 0
  );
  return `${segments[0]} 20 ${segments[1]} 20 ${segments[2]} 20 ${segments[3]} 20 ${segments[4]} 20 ${segments[5]} 1000`;
}

/**
 * Calculate rotation angle for elevation border
 */
export function getElevationRotation(bearing: number | null): number {
  const angle = (bearing ?? 0) + ELEVATION_ROTATION_OFFSET;
  return angle >= 360 ? angle - 360 : angle;
}
