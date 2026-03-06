import { type ReactNode } from 'react';
import { convertWindSpeed } from './map.utils';
import { parseValidBearings, type WindUnit } from '../station';
import { getTextColor, getWindColor } from '@/lib/utils';

const DEFAULT_STATION_MARKER_SIZE = 50; // default bounding box size in pixels

export interface StationMarkerProps {
  bearing?: number; // degrees clockwise from North — tail tip points this way
  speed?: number; // wind speed value shown in circle
  gust?: number; // gust speed
  size?: number; // bounding box size in px (default: 50)
  validBearings?: string;
  isOffline?: boolean;
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
  bearing,
  speed,
  gust,
  size = DEFAULT_STATION_MARKER_SIZE,
  validBearings,
  isOffline,
  unit
}: StationMarkerProps): ReactNode => {
  const parsedValidBearings = parseValidBearings(validBearings);
  const isBearingValid =
    bearing !== undefined &&
    parsedValidBearings.some(([from, to]) => bearing >= from && bearing <= to);
  const coreColor = getWindColor(speed ?? 0);
  const gustColor = getWindColor(gust ?? speed ?? 0);

  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.25; // circle radius
  const tailLength = size * 0.2; // how far tip extends beyond circle edge

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

  // Position gust text outside circle, next to tail
  let gustX = null;
  let gustY = null;
  if (!isOffline && speed !== undefined && bearing !== undefined) {
    const rad = ((bearing + 45) * Math.PI) / 180;
    gustX = cx - fontSize * 1.4 * Math.sin(rad);
    gustY = cy + fontSize * 1.4 * Math.cos(rad);
  }

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
        {/* Tail Shape rotated so tail tip points in wind direction (0 = North/up) */}
        {speed !== undefined && bearing !== undefined && (
          <g transform={`rotate(${bearing},${cx},${cy})`}>
            {bearing !== undefined ? (
              <path
                d={tail_attr}
                fill={gustColor}
                stroke={isBearingValid ? 'gold' : 'black'}
                strokeWidth={borderWidth}
              />
            ) : null}
          </g>
        )}

        {/* Circle (core color) - drawn outside rotation so it appears cleanly on top */}
        <circle cx={cx} cy={cy} r={R} fill={coreColor} stroke="none" />

        {/* White/gold border on circle only — drawn on top so it covers the tail join */}
        <circle
          cx={cx}
          cy={cy}
          r={R}
          fill="none"
          stroke={isBearingValid ? 'gold' : 'black'}
          strokeWidth={isBearingValid ? borderWidth * 5 : borderWidth}
        />

        {/* Speed: always upright, centered in circle */}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="'Arial Rounded MT Bold','Helvetica Neue',Arial,sans-serif"
          fontSize={fontSize}
          fontWeight="200"
          fill={isOffline ? 'red' : getTextColor(coreColor)}
        >
          {isOffline ? 'X' : speed !== undefined ? convertWindSpeed(speed, unit) : '-'}
        </text>

        {/* Gust: smaller text outside circle; hidden at low zoom via .marker.gust-label-hidden */}
        {gustX !== null && gustY !== null && (
          <text
            className="marker-gust-label"
            x={gustX}
            y={gustY}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="'Arial Rounded MT Bold','Helvetica Neue',Arial,sans-serif"
            fontSize={0.7 * fontSize}
            fontWeight="200"
            fill="black"
          >
            {gust ? `${convertWindSpeed(gust, unit)}` : ''}
          </text>
        )}
      </svg>
    </div>
  );
};
