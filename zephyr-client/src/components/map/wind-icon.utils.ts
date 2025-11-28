import { useMemo } from "react";

export type IconShape = "arrow" | "circle";
export type IconBorder = "none" | "gold" | "gold-valid";

// Color mapping for wind speed thresholds
export const WIND_COLORS = {
  white: "#ffffff",
  "light-green": "#90EE90",
  green: "#00c800",
  yellow: "#ffff00",
  orange: "#ffa500",
  red: "#ff0000",
  purple: "#800080",
  black: "#000000",
} as const;

export type WindColorName = keyof typeof WIND_COLORS;

/**
 * Get wind color based on average wind speed (in km/h)
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
 * Determine icon shape and border based on wind data
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

/**
 * Generate inline SVG data URL for use as CSS background-image
 * This allows using the SVG in places that expect background-image URLs
 */
export function getWindIconDataUrl(
  shape: IconShape,
  border: IconBorder,
  colorName: WindColorName
): string {
  const color = WIND_COLORS[colorName];

  // Gold border for popular sites
  const goldBorderSvg =
    border !== "none"
      ? `
    <path d="M15 85 Q5 65 5 45 Q5 20 25 8" fill="none" stroke="#FFD700" stroke-width="4" stroke-linecap="round"/>
    <path d="M85 85 Q95 65 95 45 Q95 20 75 8" fill="none" stroke="#FFD700" stroke-width="4" stroke-linecap="round"/>
  `
      : "";

  // Green tail for favorable wind direction
  const tailSvg =
    border === "gold-valid"
      ? `<path d="M50 80 L50 130 L42 118 M50 130 L58 118" fill="none" stroke="#22c55e" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`
      : "";

  const shapeSvg =
    shape === "arrow"
      ? `<path d="M50 10 C30 10 15 30 15 50 C15 70 35 95 50 120 C65 95 85 70 85 50 C85 30 70 10 50 10 Z" fill="${color}" stroke="#333" stroke-width="2"/>
       <ellipse cx="50" cy="45" rx="25" ry="25" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>`
      : `<circle cx="50" cy="50" r="30" fill="${color}" stroke="#333" stroke-width="2"/>
       <circle cx="50" cy="46" r="16" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 144">${goldBorderSvg}${tailSvg}${shapeSvg}</svg>`;

  // Encode for use in CSS url()
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");

  return `url("data:image/svg+xml,${encoded}")`;
}

/**
 * Cache for pre-generated data URLs
 */
const dataUrlCache = new Map<string, string>();

/**
 * Get cached wind icon data URL
 */
export function getCachedWindIconDataUrl(
  shape: IconShape,
  border: IconBorder,
  colorName: WindColorName
): string {
  const key = `${shape}-${border}-${colorName}`;

  if (!dataUrlCache.has(key)) {
    dataUrlCache.set(key, getWindIconDataUrl(shape, border, colorName));
  }

  return dataUrlCache.get(key)!;
}

/**
 * Hook for memoized wind icon data URL
 */
export function useWindIconDataUrl(
  shape: IconShape,
  border: IconBorder,
  colorName: WindColorName
): string {
  return useMemo(
    () => getCachedWindIconDataUrl(shape, border, colorName),
    [shape, border, colorName]
  );
}

/**
 * Get arrow style - replacement for the old getArrowStyle function
 * Returns [backgroundImageUrl, textColor]
 */
export function getArrowStyleSvg(
  avgWind: number | null,
  currentBearing: number | null,
  validBearings: string | null,
  isOffline: boolean | null
): [string, string] {
  const { shape, border, colorName, textColor } = getIconConfig(
    avgWind,
    currentBearing,
    validBearings,
    isOffline
  );

  const img = getCachedWindIconDataUrl(shape, border, colorName);
  return [img, textColor];
}
