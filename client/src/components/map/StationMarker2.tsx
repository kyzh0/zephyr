/**
 * Wind Direction SVG Marker Component
 *
 * Shape: large circle with a seamless sharp triangular tail.
 * The triangle sides are computed as true tangent lines from the tip to the
 * circle, so the join between tail and circle is perfectly smooth with no gap.
 *
 * Direction: 0 = North (tail points up), 90 = East, 180 = South, 270 = West
 */

import { type ReactNode } from 'react';
import { convertWindSpeed } from './map.utils';
import type { StationMarkerProps } from './StationMarker';
import { getWindColor } from '@/lib/utils';

const DEFAULT_SIZE = 60; // default bounding box size in pixels

/**
 * React component for rendering a wind direction marker SVG using the same
 * props interface as `StationMarker` (StationMarkerProps).
 */
export const StationMarker = ({
  bearing: direction,
  speed,
  gust,
  size = DEFAULT_SIZE,
  unit
}: StationMarkerProps): ReactNode => {
  const coreColor = getWindColor(speed ?? 0);
  const gustColor = getWindColor(gust ?? speed ?? 0);

  const cx = size / 2;
  const cy = size / 2;
  const tipLength = size * 0.3; // how far tip extends from center
  const width = size * 0.3; // width at the widest point
  const biteDepth = size * 0.05; // how far the inner bite goes inward

  // Tip: straight down from center (before rotation)
  const tipX = cx;
  const tipY = cy - tipLength;

  // Right side point
  const rightX = cx + width / 2;
  const rightY = cy + tipLength * 0.5;

  // Left side point
  const leftX = cx - width / 2;
  const leftY = cy + tipLength * 0.5;

  // Inner bite point (goes inward on the bottom)
  const biteX = cx;
  const biteY = cy + tipLength * 0.5 - biteDepth;

  // 4-sided polygon: tip → right → bite → left → back to tip
  const polygon_attr = [
    `M ${tipX.toFixed(4)} ${tipY.toFixed(4)}`,
    `L ${rightX.toFixed(4)} ${rightY.toFixed(4)}`,
    `L ${biteX.toFixed(4)} ${biteY.toFixed(4)}`,
    `L ${leftX.toFixed(4)} ${leftY.toFixed(4)}`,
    `Z`
  ].join(' ');

  const fontSize = Math.round(size * 0.18);
  const borderWidth = (size * 0.05).toFixed(2);
  const textY = cy + tipLength * 0.5 + fontSize * 1.2; // positioned at bottom of arrow

  return (
    <div className="inline-block" style={{ width: size, height: size }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <g transform={`rotate(${(direction ?? 0) + 180},${cx},${cy})`}>
          {direction !== undefined ? (
            <path d={polygon_attr} fill={coreColor} stroke={gustColor} strokeWidth={borderWidth} />
          ) : null}
        </g>

        <text
          x={cx}
          y={textY}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="'Arial Rounded MT Bold','Helvetica Neue',Arial,sans-serif"
          fontSize={fontSize}
          fontWeight="200"
          fill="black"
        >
          {speed ? convertWindSpeed(speed, unit) : '-'}
          {gust ? `/${convertWindSpeed(gust, unit)}` : ''}
        </text>
      </svg>
    </div>
  );
};
