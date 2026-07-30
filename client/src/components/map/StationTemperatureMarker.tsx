import { type ReactNode } from 'react';

import { getTextColor, getWindColorForSport } from '@/lib/utils';

const DEFAULT_STATION_MARKER_SIZE = 50; // default bounding box size in pixels

export interface StationTemperatureMarkerProps {
  temperature: number | null; // temperature value shown in circle
  size?: number; // bounding box size in px (default: 50)
  isOffline?: boolean;
}

/**
 * Generates SVG for a single temperature marker.
 *
 * The circle is centered in the bounding box, with the temperature value
 * displayed in the center.
 */
export const StationTemperatureMarker = ({
  temperature,
  size = DEFAULT_STATION_MARKER_SIZE,
  isOffline
}: StationTemperatureMarkerProps): ReactNode => {
  const coreColor = isOffline ? 'white' : getWindColorForSport(temperature, 'temperature');

  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.25; // circle radius

  const fontSize = Math.round(R * 1.15);

  const borderWidth = size * 0.01;
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      {/* SVG overlay for the orange bearing arcs */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Circle (core color) - drawn outside rotation so it appears cleanly on top */}
        {/* Attach pointerevents to this circle only, so interactivity is bounded to the circle only */}
        <circle
          className="interactive-circle"
          cx={cx}
          cy={cy}
          r={R}
          fill={coreColor}
          stroke="none"
          pointerEvents="auto"
        />

        {/* White/gold border on circle only — drawn on top so it covers the tail join */}
        <circle
          cx={cx}
          cy={cy}
          r={R}
          fill="none"
          stroke="black"
          strokeWidth={borderWidth}
          pointerEvents="none"
        />

        {/* Temperature: always upright, centered in circle */}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Roboto,Arial,sans-serif"
          fontSize={fontSize}
          fontWeight="600"
          fill={isOffline ? 'red' : getTextColor(coreColor)}
          pointerEvents="none"
        >
          {isOffline ? 'X' : temperature !== null ? `${temperature.toFixed(0)}°` : '-'}
        </text>
      </svg>
    </div>
  );
};
