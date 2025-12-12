export type IconShape = "arrow" | "circle";
export type IconBorder = "none" | "gold" | "gold-valid";

// Color names for wind speed thresholds (matching PNG filenames)
export type WindColorName =
  | "white"
  | "light-green"
  | "green"
  | "yellow"
  | "orange"
  | "red"
  | "purple"
  | "black";

/**
 * Get wind color name based on average wind speed (in km/h)
 */
export function getWindColor(avgWind: number | null): WindColorName {
  if (avgWind == null || avgWind < 5) return "white";
  if (avgWind < 15) return "light-green";
  if (avgWind < 23) return "green";
  if (avgWind < 30) return "yellow";
  if (avgWind < 35) return "orange";
  if (avgWind < 60) return "red";
  if (avgWind < 80) return "purple";
  return "black";
}

/**
 * Get text color for wind speed overlay
 */
export function getTextColor(avgWind: number | null): string {
  if (avgWind == null) return "black";
  if (avgWind >= 35) return "white";
  return "black";
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
  let textColor = "black";
  let img = "";

  if (isOffline) {
    textColor = "#ff4261";
    img = `url('/circle-white.png')`;
    return [img, textColor];
  }

  let prefix = "";
  if (currentBearing != null && avgWind != null) {
    // station has bearings, check if within bounds
    if (validBearings) {
      prefix = "gold-arrow";
      const pairs = validBearings.split(",");
      for (const p of pairs) {
        const bearings = p.split("-");
        if (bearings.length === 2) {
          const bearing1 = Number(bearings[0]);
          const bearing2 = Number(bearings[1]);
          if (bearing1 <= bearing2) {
            if (currentBearing >= bearing1 && currentBearing <= bearing2) {
              prefix = "gold-valid-arrow";
              break;
            }
          } else {
            if (currentBearing >= bearing1 || currentBearing <= bearing2) {
              prefix = "gold-valid-arrow";
              break;
            }
          }
        }
      }
    } else {
      // station has no bearings
      prefix = "arrow";
    }
  } else {
    // wind has no direction or avg is null
    prefix = validBearings ? "gold-circle" : "circle";
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
    textColor = "white";
  } else if (avgWind < 80) {
    img = `url('/${prefix}-purple.png')`;
    textColor = "white";
  } else {
    img = `url('/${prefix}-black.png')`;
    textColor = "white";
  }
  return [img, textColor];
}

/**
 * Determine icon shape and border based on wind data
 * @deprecated Use getArrowStyle instead for PNG-based icons
 */
export function getIconConfig(
  avgWind: number | null,
  currentBearing: number | null,
  validBearings: string | null,
  isOffline: boolean | null
): {
  shape: IconShape;
  border: IconBorder;
  colorName: WindColorName;
  textColor: string;
} {
  // Offline stations show a white circle with red text
  if (isOffline) {
    return {
      shape: "circle",
      border: "none",
      colorName: "white",
      textColor: "#ff4261",
    };
  }

  let shape: IconShape;
  let border: IconBorder;

  if (currentBearing != null && avgWind != null) {
    // Station has bearings
    shape = "arrow";

    if (validBearings) {
      // Check if current bearing is within valid range
      border = "gold"; // Default to gold (outside valid range)
      const pairs = validBearings.split(",");
      for (const p of pairs) {
        const bearings = p.split("-");
        if (bearings.length === 2) {
          const bearing1 = Number(bearings[0]);
          const bearing2 = Number(bearings[1]);
          if (bearing1 <= bearing2) {
            if (currentBearing >= bearing1 && currentBearing <= bearing2) {
              border = "gold-valid";
              break;
            }
          } else {
            // Wraps around 360 degrees
            if (currentBearing >= bearing1 || currentBearing <= bearing2) {
              border = "gold-valid";
              break;
            }
          }
        }
      }
    } else {
      // Station has no valid bearings defined
      border = "none";
    }
  } else {
    // Wind has no direction or avg is null
    shape = "circle";
    border = validBearings ? "gold" : "none";
  }

  const colorName = getWindColor(avgWind);
  const textColor = getTextColor(avgWind);

  return { shape, border, colorName, textColor };
}
