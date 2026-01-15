import { type ReactNode, useMemo } from "react";

interface SiteMarkerProps {
  validBearings?: string;
  size?: number;
  borderWidth?: number;
}

/**
 * SiteMarker component - displays a circular marker with the site logo
 * and an orange border arc indicating valid wind bearings
 */
export const SiteMarker = ({
  validBearings,
  size = 60,
  borderWidth = 15,
}: SiteMarkerProps): ReactNode => {
  // Parse validBearings to calculate the arc
  const arcPath = useMemo(() => {
    if (!validBearings) return null;

    // Parse bearings string (e.g., "NW-NE", "180-270", "N")
    const bearings = validBearings.trim();

    // Convert compass directions to degrees
    const compassToDegrees = (direction: string): number => {
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
        NNW: 337.5,
      };
      return compass[direction.toUpperCase()] ?? parseFloat(direction);
    };

    let startAngle: number;
    let endAngle: number;

    if (bearings.includes("-")) {
      // Range of bearings (e.g., "NW-NE" or "270-90")
      const [start, end] = bearings.split("-").map((s) => s.trim());
      startAngle = compassToDegrees(start);
      endAngle = compassToDegrees(end);
    } else {
      // Single bearing - create a small arc around it (±30 degrees)
      const bearing = compassToDegrees(bearings);
      startAngle = bearing - 30;
      endAngle = bearing + 30;
    }

    // Normalize angles
    if (startAngle < 0) startAngle += 360;
    if (endAngle < 0) endAngle += 360;

    // Calculate arc parameters
    const radius = size / 2;
    const innerRadius = radius - borderWidth;

    // Convert to radians (SVG rotates from 0° at top, clockwise)
    // Subtract 90 to rotate coordinate system so 0° is at top (North)
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    // Calculate if we need the large arc flag
    let deltaAngle = endAngle - startAngle;
    if (deltaAngle < 0) deltaAngle += 360;
    const largeArcFlag = deltaAngle > 180 ? 1 : 0;

    // Calculate outer arc points
    const outerStartX = radius + radius * Math.cos(startRad);
    const outerStartY = radius + radius * Math.sin(startRad);
    const outerEndX = radius + radius * Math.cos(endRad);
    const outerEndY = radius + radius * Math.sin(endRad);

    // Calculate inner arc points
    const innerStartX = radius + innerRadius * Math.cos(startRad);
    const innerStartY = radius + innerRadius * Math.sin(startRad);
    const innerEndX = radius + innerRadius * Math.cos(endRad);
    const innerEndY = radius + innerRadius * Math.sin(endRad);

    // Create the arc path (outer arc + inner arc in reverse)
    return `
      M ${outerStartX} ${outerStartY}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${outerEndX} ${outerEndY}
      L ${innerEndX} ${innerEndY}
      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStartX} ${innerStartY}
      Z
    `;
  }, [validBearings, size, borderWidth]);

  return (
    <div
      className="relative inline-block"
      style={{ width: size, height: size }}
    >
      {/* SVG overlay for the orange bearing arc */}
      {arcPath && (
        <svg
          className="absolute inset-0 pointer-events-none"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: "rotate(0deg)" }}
        >
          <path d={arcPath} fill="#04ff00" fillOpacity="0.9" />
        </svg>
      )}

      {/* Circle container with site logo */}
      <div
        className="absolute inset-0 rounded-full bg-white shadow-sm flex items-center justify-center overflow-hidden"
        style={{
          margin: borderWidth,
          width: size - borderWidth * 2,
          height: size - borderWidth * 2,
        }}
      >
        {/* Site icon using CSS mask */}
        <div
          className="w-full h-full"
          style={{
            backgroundColor: "black",
            mask: 'url("/site.svg") center / 70% no-repeat',
            WebkitMask: 'url("/site.svg") center / 70% no-repeat',
          }}
        />
      </div>
    </div>
  );
};
