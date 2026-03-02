export type IconShape = 'arrow' | 'circle';
export type IconBorder = 'none' | 'gold' | 'gold-valid';

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
