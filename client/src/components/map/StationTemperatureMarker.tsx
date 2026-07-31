import { type ReactNode } from 'react';

import { getTextColor, interpolateColor } from '@/lib/utils';

const DEFAULT_STATION_MARKER_SIZE = 50; // default bounding box size in pixels

export interface StationTemperatureMarkerProps {
  temperature: number | null; // temperature value shown in circle
  size?: number; // bounding box size in px (default: 50)
  isOffline?: boolean;
}

const getColorForTemperature = (temp: number | null): string => {
  if (temp == null) return '#FFFFFF';

  const nzMonthlyAverages: { high: number; medium: number; low: number }[] = [
    { high: 25, medium: 18, low: 11 },
    { high: 25, medium: 18, low: 10 },
    { high: 23, medium: 15, low: 7 },
    { high: 20, medium: 12, low: 4 },
    { high: 18, medium: 10, low: 2 },
    { high: 15, medium: 7, low: -2 },
    { high: 14, medium: 6, low: -2 },
    { high: 15, medium: 8, low: 0 },
    { high: 16, medium: 9, low: 2 },
    { high: 19, medium: 12, low: 4 },
    { high: 21, medium: 15, low: 7 },
    { high: 23, medium: 17, low: 9 }
  ];

  const currentMonthAvg = nzMonthlyAverages[new Date().getMonth()];

  const colors = [
    { temp: currentMonthAvg.low - 10, hex: '#f536ff' },
    { temp: currentMonthAvg.low, hex: '#b1fffe' },
    { temp: currentMonthAvg.medium, hex: '#91ffc4' },
    { temp: currentMonthAvg.high, hex: '#f8ff71' },
    { temp: currentMonthAvg.high + 10, hex: '#ff4d4d' }
  ];

  for (let i = 0; i < colors.length - 1; i++) {
    if (temp >= colors[i].temp && temp <= colors[i + 1].temp) {
      const tempRange = colors[i + 1].temp - colors[i].temp;
      const factor = tempRange === 0 ? 0 : (temp - colors[i].temp) / tempRange;
      return interpolateColor(colors[i].hex, colors[i + 1].hex, factor);
    }
  }

  return colors[colors.length - 1].hex;
};

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
  const hasTemperature = temperature !== null && !isOffline;
  const coreColor = hasTemperature ? getColorForTemperature(temperature) : 'white';

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
        opacity={hasTemperature ? 1 : 0.4}
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
