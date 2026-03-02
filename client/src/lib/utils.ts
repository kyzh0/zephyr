import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const REFRESH_INTERVAL_MS = 60 * 1000;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Common error handling utility
export const handleError = (err: unknown, defaultMessage: string): Error => {
  return err instanceof Error ? err : new Error(defaultMessage);
};

export const getWindDirectionFromBearing = (bearing: number) => {
  if (bearing < 0) {
    return '';
  } else if (bearing <= 11.25) {
    return 'N';
  } else if (bearing <= 33.75) {
    return 'NNE';
  } else if (bearing <= 56.25) {
    return 'NE';
  } else if (bearing <= 78.75) {
    return 'ENE';
  } else if (bearing <= 101.25) {
    return 'E';
  } else if (bearing <= 123.75) {
    return 'ESE';
  } else if (bearing <= 146.25) {
    return 'SE';
  } else if (bearing <= 168.75) {
    return 'SSE';
  } else if (bearing <= 191.25) {
    return 'S';
  } else if (bearing <= 213.75) {
    return 'SSW';
  } else if (bearing <= 236.25) {
    return 'SW';
  } else if (bearing <= 258.75) {
    return 'WSW';
  } else if (bearing <= 281.25) {
    return 'W';
  } else if (bearing <= 303.75) {
    return 'WNW';
  } else if (bearing <= 326.25) {
    return 'NW';
  } else if (bearing <= 348.75) {
    return 'NNW';
  } else {
    return 'N';
  }
};

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [255, 255, 255];
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

/**
 * Convert RGB values to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Interpolate between two hex colors
 */
function interpolateColor(color1: string, color2: string, factor: number): string {
  const [r1, g1, b1] = hexToRgb(color1);
  const [r2, g2, b2] = hexToRgb(color2);

  const r = r1 + (r2 - r1) * factor;
  const g = g1 + (g2 - g1) * factor;
  const b = b1 + (b2 - b1) * factor;

  return rgbToHex(r, g, b);
}

/**
 * Get wind color as hex value with smooth transitions between bands
 * Transitions smoothly between color bands based on wind speed (in km/h)
 */
export const getWindColor = (avgWindKph: number | null): string => {
  const colors = [
    { speed: 0, hex: '#FFFFFF' }, // white
    { speed: 5, hex: '#A8D8A8' }, // light-green
    { speed: 15, hex: '#228B22' }, // green
    { speed: 23, hex: '#FFFF00' }, // yellow
    { speed: 30, hex: '#FFA500' }, // orange
    { speed: 35, hex: '#FF0000' }, // red
    { speed: 60, hex: '#800080' }, // purple
    { speed: 80, hex: '#000000' } // black
  ];

  if (avgWindKph == null) return colors[0].hex;

  // Find the two colors to interpolate between
  for (let i = 0; i < colors.length - 1; i++) {
    if (avgWindKph >= colors[i].speed && avgWindKph <= colors[i + 1].speed) {
      const speedRange = colors[i + 1].speed - colors[i].speed;
      const factor = speedRange === 0 ? 0 : (avgWindKph - colors[i].speed) / speedRange;
      return interpolateColor(colors[i].hex, colors[i + 1].hex, factor);
    }
  }

  // Return black if speed exceeds the highest threshold
  return colors[colors.length - 1].hex;
};

/**
 * Get text color (black or white) based on background hex color brightness
 * Returns white text for dark backgrounds, black text for light backgrounds
 */
export function getTextColor(hexColor: string): string {
  const [r, g, b] = hexToRgb(hexColor);

  // Calculate perceived brightness using standard formula
  // Weights colors by human perception (green appears brighter than red, which appears brighter than blue)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  // Return white text for dark backgrounds, black for light
  return brightness > 128 ? 'black' : 'white';
}

export const getStationTypeName = (code: string) => {
  switch (code) {
    case 'wu':
      return 'Weather Underground';
    case 'wow':
      return 'Met Office WOW';
    case 'po':
      return 'Port Otago';
    case 'wp':
      return 'Weather Pro';
    case 'cp':
      return 'CentrePort';
    case 'sfo':
      return 'Sofar Ocean';
    case 'gw':
      return 'Greater Wellington';
    case 'cwu':
      return 'Canterbury Weather Updates';
    case 'mpyc':
      return 'Mt Pleasant Yacht Club';
    case 'lpc':
      return 'Lyttelton Port Company';
    case 'levin':
      return 'Ecowitt';
    case 'mrc':
      return 'Mountain Research Centre';
    case 'mfhb':
      return "Model Flying Hawke's Bay";
    case 'wainui':
      return 'Wainuiomata';
    case 'prime':
      return 'Prime Port';
    case 'porters':
      return 'Porters Alpine Resort';
    case 'wl':
      return 'Weatherlink';
    case 'hw':
      return 'Hutt Weather';
    case 'pw':
      return 'PredictWind';
    case 'wi':
      return 'Whanganui Inlet';
    case 'hbrc':
      return "Hawke's Bay Regional Council";
    case 'ac':
      return 'Auckland Council';
    case 'wswr':
      return 'WSWR';
    case 'sp':
      return 'South Port';
    case 'tclz':
      return 'Treble Cone WX';
    default:
      return code.charAt(0).toUpperCase() + code.slice(1);
  }
};

export const getWebcamTypeName = (code: string) => {
  switch (code) {
    case 'lw':
      return 'Lake Wanaka';
    case 'qa':
      return 'Queenstown Airport';
    case 'wa':
      return 'Wanaka Airport';
    case 'cgc':
      return 'Canterbury Gliding Club';
    case 'ch':
      return 'Castle Hill';
    case 'cm':
      return 'Mt Cheeseman';
    case 'cwu':
      return 'Canterbury Weather Updates';
    case 'ap':
      return 'Arthurs Pass';
    case 'hutt':
      return 'Mt Hutt';
    case 'ts':
      return 'Taylors Surf';
    case 'camftp':
      return 'Camera FTP';
    default:
      return code.charAt(0).toUpperCase() + code.slice(1);
  }
};

// Haversine distance calculation (returns meters)
export const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371 * 1000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const getMinutesAgo = (date: Date): string => {
  const diff = new Date().getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) {
    return 'just now';
  } else if (minutes === 1) {
    return '1 minute ago';
  } else if (minutes > 60 * 24) {
    return `Over ${Math.floor(minutes / (60 * 24))} days ago`;
  } else if (minutes > 60) {
    return `Over ${Math.floor(minutes / 60)} hours ago`;
  } else {
    return `${minutes} minutes ago`;
  }
};

// Convert compass directions to degrees
export const compassToDegrees = (direction: string): number => {
  const compass: Record<string, number> = {
    N: 0,
    NNE: 22.5,
    NE: 45,
    ENE: 67.5,
    E: 90,
    ESE: 112.5,
    SE: 135,
    SSE: 157.5,
    S: 180,
    SSW: 202.5,
    SW: 225,
    WSW: 247.5,
    W: 270,
    WNW: 292.5,
    NW: 315,
    NNW: 337.5
  };
  return compass[direction.toUpperCase()] ?? parseFloat(direction);
};

// Parse valid bearings string into array of {start, end} sectors
export const parseValidBearings = (
  bearings: string | undefined
): { start: number; end: number }[] => {
  if (!bearings) {
    return [];
  }

  const sectors: { start: number; end: number }[] = [];
  const pairs = bearings.split(',');

  for (const pair of pairs) {
    const trimmedPair = pair.trim();

    if (trimmedPair.includes('-')) {
      // Range of bearings (e.g., "NW-NE" or "270-90")
      const [start, end] = trimmedPair.split('-').map((s) => s.trim());
      const startAngle = compassToDegrees(start);
      const endAngle = compassToDegrees(end);

      // Handle wrapping around 0/360
      if (startAngle <= endAngle) {
        sectors.push({ start: startAngle, end: endAngle });
      } else {
        sectors.push({ start: startAngle, end: 360 });
        sectors.push({ start: 0, end: endAngle });
      }
    } else {
      // Single bearing - create a small arc around it (±30 degrees)
      const bearing = compassToDegrees(trimmedPair);
      let startAngle = bearing - 30;
      let endAngle = bearing + 30;

      // Normalize angles
      if (startAngle < 0) startAngle += 360;
      if (endAngle > 360) endAngle -= 360;

      if (startAngle <= endAngle) {
        sectors.push({ start: startAngle, end: endAngle });
      } else {
        sectors.push({ start: startAngle, end: 360 });
        sectors.push({ start: 0, end: endAngle });
      }
    }
  }

  return sectors;
};

export const lookupElevation = async (lat: number, lon: number): Promise<number> => {
  const response = await fetch(
    `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`,
    { method: 'GET' }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch elevation');
  }

  const data = (await response.json()) as {
    elevation: number[];
  };

  if (!data.elevation?.length) {
    throw new Error('No elevation data returned');
  }

  return Math.round(data.elevation[0]);
};
