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
import type { WindUnit } from '../station';
import { getTextColor, getWindColor } from '@/lib/utils';

const DEFAULT_SIZE = 50; // default bounding box size in pixels

export interface StationMarkerProps {
  direction?: number; // degrees clockwise from North — tail tip points this way
  speed?: number; // wind speed value shown in circle
  gust?: number; // gust speed
  size?: number; // bounding box size in px (default: 50)
  unit: WindUnit;
}

// ─── Core SVG builder ──────────────────────────────────────────────────────────

/**
 * Generates SVG for a single wind direction marker.
 *
 * The tail tip is placed straight below the circle centre, then the whole
 * shape is rotated by `direction` degrees. The triangle base points are the
 * true tangent points from the tip to the circle — so the sides of the
 * triangle are tangent to the circle edge and the join is seamless.
 */
export const StationMarker = ({
  direction,
  speed,
  gust,
  size = DEFAULT_SIZE,
  unit
}: StationMarkerProps): ReactNode => {
  const coreColor = getWindColor(speed ?? 0);
  const gustColor = getWindColor(gust ?? speed ?? 0);

  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.25; // circle radius
  const tailLength = size * 0.3; // how far tip extends beyond circle edge

  // Tip: straight down from circle centre (before rotation)
  const tipX = cx;
  const tipY = cy + R + tailLength;

  // Distance from circle centre to tip
  const d = R + tailLength;

  // Angle from the centre→tip direction to each tangent point.
  // In right triangle: adjacent = R, hypotenuse = d  →  phi = arccos(R/d)
  const phi = Math.acos(R / d);

  // Tangent points on the circle edge (tip is straight down, so base angle is π/2)
  const lx = cx - R * Math.sin(phi);
  const ly = cy + R * Math.cos(phi);
  const rx = cx + R * Math.sin(phi);
  const ry = cy + R * Math.cos(phi);

  // Tail triangle: from left tangent → tip → right tangent
  const tail_attr = [
    `M ${lx.toFixed(4)} ${ly.toFixed(4)}`,
    `L ${tipX.toFixed(4)} ${tipY.toFixed(4)}`,
    `L ${rx.toFixed(4)} ${ry.toFixed(4)}`,
    `Z`
  ].join(' ');

  const fontSize = Math.round(R * 1.15);

  const borderWidth = (size * 0.02).toFixed(2);
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      {/* SVG overlay for the orange bearing arcs */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Shape rotated so tail tip points in wind direction (0 = North/up) */}
        <g transform={`rotate(${direction},${cx},${cy})`}>
          {direction !== undefined ? <path d={tail_attr} fill={gustColor} stroke="none" /> : null}
        </g>

        {/* Circle (core color) - drawn outside rotation so it appears cleanly on top */}
        <circle cx={cx} cy={cy} r={R} fill={coreColor} stroke="none" />

        {/* White border on circle only — drawn on top so it covers the tail join */}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="white" stroke-width={borderWidth} />

        {/* Speed: always upright, centered in circle */}
        <text
          x={cx}
          y={cy}
          text-anchor="middle"
          dominant-baseline="central"
          font-family="'Arial Rounded MT Bold','Helvetica Neue',Arial,sans-serif"
          font-size={fontSize}
          font-weight="200"
          fill={getTextColor(coreColor)}
        >
          {speed ? convertWindSpeed(speed, unit) : '-'}
        </text>
      </svg>
    </div>
  );
};
