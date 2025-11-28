import type { IconShape, IconBorder } from "./wind-icon.utils";

export interface WindIconProps {
  shape: IconShape;
  border: IconBorder;
  color: string;
  tailColor?: string; // Color for the tail (e.g., green for favorable wind)
  className?: string;
}

/**
 * SVG Wind Icon component - replaces all arrow-*.png and circle-*.png files
 * Supports dynamic theming via the color prop
 * Shows a colored tail when wind direction is favorable
 */
export function WindIcon({
  shape,
  border,
  color,
  tailColor,
  className = "",
}: WindIconProps) {
  const showTail = border === "gold-valid" || !!tailColor;
  const actualTailColor = tailColor || "#22c55e"; // Default to green

  return (
    <svg
      viewBox="0 0 100 144"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Gold border decorations for popular sites */}
      {border !== "none" && <GoldBorder />}

      {/* Tail for favorable wind direction */}
      {showTail && <Tail color={actualTailColor} />}

      {/* Main shape */}
      {shape === "arrow" ? (
        <ArrowShape color={color} />
      ) : (
        <CircleShape color={color} />
      )}
    </svg>
  );
}

function ArrowShape({ color }: { color: string }) {
  return (
    <g>
      {/* Arrow body - teardrop/pin shape pointing up */}
      <path
        d="M50 10 
           C30 10 15 30 15 50 
           C15 70 35 95 50 120 
           C65 95 85 70 85 50 
           C85 30 70 10 50 10 Z"
        fill={color}
        stroke="#333"
        strokeWidth="2"
      />
      {/* Inner highlight for depth */}
      <ellipse
        cx="50"
        cy="45"
        rx="25"
        ry="25"
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="2"
      />
    </g>
  );
}

function CircleShape({ color }: { color: string }) {
  return (
    <g>
      {/* Circle centered in the viewBox */}
      <circle
        cx="50"
        cy="50"
        r="30"
        fill={color}
        stroke="#333"
        strokeWidth="2"
      />
      {/* Inner highlight for depth */}
      <circle
        cx="50"
        cy="46"
        r="16"
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="2"
      />
    </g>
  );
}

function Tail({ color }: { color: string }) {
  return (
    <g>
      {/* Tail extending from bottom of circle/arrow */}
      <path
        d="M50 80 L50 130 L42 118 M50 130 L58 118"
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

function GoldBorder() {
  return (
    <g>
      {/* Gold decorative border arc for popular sites */}
      <path
        d="M15 85 
           Q5 65 5 45 
           Q5 20 25 8"
        fill="none"
        stroke="#FFD700"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M85 85 
           Q95 65 95 45 
           Q95 20 75 8"
        fill="none"
        stroke="#FFD700"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </g>
  );
}

export default WindIcon;
