import { type ReactNode, useMemo } from "react";
import { parseValidBearings } from "@/lib/utils";

interface SiteMarkerProps {
  validBearings?: string;
  isOfficial?: boolean;
  size?: number;
  borderWidth?: number;
}

/**
 * SiteMarker component - displays a circular marker with the site logo
 * and an orange border arc indicating valid wind bearings
 */
export const SiteMarker = ({
  validBearings,
  isOfficial,
  size = 50,
  borderWidth = 15,
}: SiteMarkerProps): ReactNode => {
  // Parse validBearings to calculate the arcs
  const arcPaths = useMemo(() => {
    const sectors = parseValidBearings(validBearings);
    if (sectors.length === 0) return [];

    // Calculate arc parameters
    const radius = size / 2;
    const innerRadius = radius - borderWidth;

    // Create a path for each sector
    return sectors.map(({ start: startAngle, end: endAngle }) => {
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
    });
  }, [validBearings, isOfficial, size, borderWidth]);

  return (
    <div
      className="relative inline-block"
      style={{ width: size, height: size }}
    >
      {/* SVG overlay for the orange bearing arcs */}
      {arcPaths.length > 0 && (
        <svg
          className="absolute inset-0 pointer-events-none"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: "rotate(0deg)" }}
        >
          {arcPaths.map((path, index) => (
            <path key={index} d={path} fill="#FFA930" fillOpacity="0.9" />
          ))}
        </svg>
      )}

      {/* Circle container with site logo */}
      <div
        className={`absolute inset-0 rounded-full border-2 overflow-hidden flex items-center justify-center bg-white ${
          isOfficial ? "border-[#d7ac00]" : "border-black"
        }`}
        style={{
          margin: borderWidth,
          width: size - borderWidth * 2,
          height: size - borderWidth * 2,
        }}
      >
        <img src="/kea.png" className="w-[60%] h-[60%] object-contain" />
      </div>
    </div>
  );
};
