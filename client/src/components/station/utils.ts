/**
 * Get direction color based on whether the bearing is within valid bearing ranges
 */
export function getDirectionColor(
  bearing: number | null | undefined,
  validBearings: string | undefined
): string {
  if (bearing != null && validBearings) {
    const pairs = validBearings.split(",");
    for (const p of pairs) {
      const bearings = p.split("-");
      if (bearings.length === 2) {
        const bearing1 = Number(bearings[0]);
        const bearing2 = Number(bearings[1]);
        if (bearing1 <= bearing2) {
          if (bearing >= bearing1 && bearing <= bearing2) {
            return "rgba(192, 255, 191, 0.5)";
          }
        } else {
          if (bearing >= bearing1 || bearing <= bearing2) {
            return "rgba(192, 255, 191, 0.5)";
          }
        }
      }
    }
  }
  return "";
}

/**
 * Get unit preference from localStorage
 */
export function getUnit(): "kt" | "kmh" {
  const unit = localStorage.getItem("unit");
  return unit === "kt" ? "kt" : "kmh";
}

/**
 * Convert wind speed based on unit preference
 */
export function convertWindSpeed(
  speed: number | null | undefined,
  unit: "kt" | "kmh"
): number | null {
  if (speed == null) return null;
  return Math.round(unit === "kt" ? speed / 1.852 : speed);
}

/**
 * Format temperature for display
 */
export function formatTemperature(temp: number | null | undefined): string {
  if (temp == null) return "";
  return `${Math.round(temp * 10) / 10}°C`;
}

/**
 * Parse valid bearings string into sector pairs
 */
export function parseValidBearings(
  validBearings: string | undefined
): [number, number][] {
  if (!validBearings) return [];

  const result: [number, number][] = [];
  const pairs = validBearings.split(",");

  for (const p of pairs) {
    const temp = p.split("-");
    if (temp.length === 2) {
      const b1 = Number(temp[0]);
      const b2 = Number(temp[1]);
      if (b1 <= b2) {
        result.push([b1, b2]);
      } else {
        result.push([b1, 360]);
        result.push([0, b2]);
      }
    }
  }

  return result;
}
