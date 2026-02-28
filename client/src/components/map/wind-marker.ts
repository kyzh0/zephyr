/**
 * Wind Direction SVG Marker Component
 *
 * Shape: large circle with a seamless sharp triangular tail.
 * The triangle sides are computed as true tangent lines from the tip to the
 * circle, so the join between tail and circle is perfectly smooth with no gap.
 *
 * Direction: 0 = North (tail points up), 90 = East, 180 = South, 270 = West
 */

import { createElement } from 'react';
import { getTextColor, getWindColorHex } from './wind-icon.utils';

const DEFAULT_SIZE = 50; // default bounding box size in pixels

export interface WindMarkerProps {
  direction: number; // degrees clockwise from North — tail tip points this way
  speed: number; // wind speed value shown in circle
  size?: number; // bounding box size in px (default: 50)
}

export interface WindMarkerSvgOptions {
  direction: number;
  speed: number;
  size?: number;
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
export function generateWindMarkerSVG({
  direction,
  speed,
  size = DEFAULT_SIZE
}: WindMarkerSvgOptions): string {
  const color = getWindColorHex(speed);

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

  // Path: large arc (sweep=0, counterclockwise) from right→left tangent point,
  // then straight lines down to the tip and back.
  const d_attr = [
    `M ${rx.toFixed(4)} ${ry.toFixed(4)}`,
    `A ${R} ${R} 0 1 0 ${lx.toFixed(4)} ${ly.toFixed(4)}`,
    `L ${tipX.toFixed(4)} ${tipY.toFixed(4)}`,
    `Z`
  ].join(' ');

  const fontSize = Math.round(R * 1.15);

  const borderWidth = (size * 0.02).toFixed(2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <!-- Shape rotated so tail tip points in wind direction (0 = North/up) -->
  <g transform="rotate(${direction},${cx},${cy})">
    <path d="${d_attr}" fill="${color}" stroke="none"/>
  </g>

  <!-- White border on circle only — drawn on top so it covers the tail join -->
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="white" stroke-width="${borderWidth}"/>

  <!-- Speed: always upright, centered in circle -->
  <text
    x="${cx}" y="${cy}"
    text-anchor="middle" dominant-baseline="central"
    font-family="'Arial Rounded MT Bold','Helvetica Neue',Arial,sans-serif"
    font-size="${fontSize}" font-weight="200"
    fill="${getTextColor(color)}"
  >${speed}</text>
</svg>`;
}

/**
 * React component for rendering a wind direction marker SVG
 */
export function WindMarker({ direction, speed, size = DEFAULT_SIZE }: WindMarkerProps) {
  const svg = generateWindMarkerSVG({ direction, speed, size });

  return createElement('div', {
    dangerouslySetInnerHTML: { __html: svg },
    className: 'wind-marker',
    style: { display: 'inline-block' }
  });
}
