export type IconShape = 'arrow' | 'circle';
export type IconBorder = 'none' | 'gold' | 'gold-valid';

// Color names for wind speed thresholds (matching PNG filenames)
export type WindColorName =
  | 'white'
  | 'light-green'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'red'
  | 'purple'
  | 'black';

/**
 * Get wind color name based on average wind speed (in km/h)
 */
export function getWindColorName(avgWind: number | null): WindColorName {
  if (avgWind == null || avgWind < 5) return 'white';
  if (avgWind < 15) return 'light-green';
  if (avgWind < 23) return 'green';
  if (avgWind < 30) return 'yellow';
  if (avgWind < 35) return 'orange';
  if (avgWind < 60) return 'red';
  if (avgWind < 80) return 'purple';
  return 'black';
}

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
export function getWindColorHex(avgWind: number | null): string {
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

  if (avgWind == null) return colors[0].hex;

  // Find the two colors to interpolate between
  for (let i = 0; i < colors.length - 1; i++) {
    if (avgWind >= colors[i].speed && avgWind <= colors[i + 1].speed) {
      const speedRange = colors[i + 1].speed - colors[i].speed;
      const factor = speedRange === 0 ? 0 : (avgWind - colors[i].speed) / speedRange;
      return interpolateColor(colors[i].hex, colors[i + 1].hex, factor);
    }
  }

  // Return black if speed exceeds the highest threshold
  return colors[colors.length - 1].hex;
}

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

/**
 * Determine icon prefix and color based on wind data
 * Returns [prefix, colorName, textColor]
 *
 * Prefix values:
 * - "arrow" - basic arrow for stations without valid bearings defined
 * - "circle" - circle for stations without wind direction
 * - "gold-arrow" - arrow with gold border (outside valid range)
 * - "gold-circle" - circle with gold border (no direction but has valid bearings)
 * - "gold-valid-arrow" - arrow with gold border and green tail (within valid range)
 */
export function getArrowStyle(
  avgWind: number | null,
  currentBearing: number | null,
  validBearings: string | null,
  isOffline: boolean | null
): [string, string] {
  let textColor = 'black';
  let img = '';

  if (isOffline) {
    textColor = '#ff4261';
    img = `url('/circle-white.png')`;
    return [img, textColor];
  }

  let prefix = '';
  if (currentBearing != null && avgWind != null) {
    // station has bearings, check if within bounds
    if (validBearings) {
      prefix = 'gold-arrow';
      const pairs = validBearings.split(',');
      for (const p of pairs) {
        const bearings = p.split('-');
        if (bearings.length === 2) {
          const bearing1 = Number(bearings[0]);
          const bearing2 = Number(bearings[1]);
          if (bearing1 <= bearing2) {
            if (currentBearing >= bearing1 && currentBearing <= bearing2) {
              prefix = 'gold-valid-arrow';
              break;
            }
          } else {
            if (currentBearing >= bearing1 || currentBearing <= bearing2) {
              prefix = 'gold-valid-arrow';
              break;
            }
          }
        }
      }
    } else {
      // station has no bearings
      prefix = 'arrow';
    }
  } else {
    // wind has no direction or avg is null
    prefix = validBearings ? 'gold-circle' : 'circle';
  }

  if (avgWind == null) {
    img = `url('/${prefix}-white.png')`;
  } else if (avgWind < 5) {
    img = `url('/${prefix}-white.png')`;
  } else if (avgWind < 15) {
    img = `url('/${prefix}-light-green.png')`;
  } else if (avgWind < 23) {
    img = `url('/${prefix}-green.png')`;
  } else if (avgWind < 30) {
    img = `url('/${prefix}-yellow.png')`;
  } else if (avgWind < 35) {
    img = `url('/${prefix}-orange.png')`;
  } else if (avgWind < 60) {
    img = `url('/${prefix}-red.png')`;
    textColor = 'white';
  } else if (avgWind < 80) {
    img = `url('/${prefix}-purple.png')`;
    textColor = 'white';
  } else {
    img = `url('/${prefix}-black.png')`;
    textColor = 'white';
  }
  return [img, textColor];
}
