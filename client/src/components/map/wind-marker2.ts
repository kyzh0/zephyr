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
import { getWindColorHex } from './wind-icon.utils';

const DEFAULT_SIZE = 100; // default bounding box size in pixels

export interface WindMarkerProps {
  direction: number; // degrees clockwise from North — tail tip points this way
  speed: number; // wind speed value shown in circle
  gust?: number; // gust speed
  size?: number; // bounding box size in px (default: 50)
}

// ─── Core SVG builder ──────────────────────────────────────────────────────────

/**
 * Generates SVG for a single wind direction marker.
 *
 * Shape: 4-sided polygon roughly triangular with an inner bite on the bottom.
 * The tip points in the wind direction, and the bottom has an inward-pointing bite.
 * Shape is rotated by `direction` degrees.
 */
export function generateWindMarker2SVG({
  direction,
  speed,
  gust,
  size = DEFAULT_SIZE
}: WindMarkerProps): string {
  const coreColor = getWindColorHex(speed);
  const gustColor = getWindColorHex(gust ?? speed);

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

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <!-- Shape rotated so tip points in wind direction (0 = North/up) -->
  <g transform="rotate(${direction},${cx},${cy})">
    <!-- 4-sided polygon with inner bite -->
    <path d="${polygon_attr}" fill="${coreColor}" stroke="${gustColor}" stroke-width="${borderWidth}"/>
  </g>

  <!-- Speed: always upright, positioned at bottom of arrow -->
  <text
    x="${cx}" y="${textY}"
    text-anchor="middle" dominant-baseline="central"
    font-family="'Arial Rounded MT Bold','Helvetica Neue',Arial,sans-serif"
    font-size="${fontSize}" font-weight="200"
    fill="black"
  >${speed}${gust ? `/${gust}` : ''}</text>
</svg>`;
}

/**
 * React component for rendering a wind direction marker SVG
 */
export function WindMarker2({ direction, speed, gust, size = DEFAULT_SIZE }: WindMarkerProps) {
  const svg = generateWindMarker2SVG({ direction, speed, gust, size });

  return createElement('div', {
    dangerouslySetInnerHTML: { __html: svg },
    className: 'wind-marker',
    style: { display: 'inline-block' }
  });
}
