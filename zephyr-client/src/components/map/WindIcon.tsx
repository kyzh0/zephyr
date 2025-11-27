import type { IconShape, IconBorder } from "./wind-icon.utils";

export interface WindIconProps {
  shape: IconShape;
  border: IconBorder;
  color: string;
  className?: string;
}

/**
 * SVG Wind Icon component - replaces all arrow-*.png and circle-*.png files
 * Supports dynamic theming via the color prop
 */
export function WindIcon({
  shape,
  border,
  color,
  className = "",
}: WindIconProps) {
  return (
    <svg
      viewBox="0 0 100 144"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Gold border decorations */}
      {border !== "none" && (
        <GoldBorder showCheckmark={border === "gold-valid"} />
      )}

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
        r="35"
        fill={color}
        stroke="#333"
        strokeWidth="2"
      />
      {/* Inner highlight for depth */}
      <circle
        cx="50"
        cy="45"
        r="20"
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="2"
      />
    </g>
  );
}

function GoldBorder({ showCheckmark }: { showCheckmark: boolean }) {
  return (
    <g>
      {/* Gold decorative border arc */}
      <path
        d="M15 100 
           Q5 80 5 50 
           Q5 20 25 8"
        fill="none"
        stroke="#FFD700"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M85 100 
           Q95 80 95 50 
           Q95 20 75 8"
        fill="none"
        stroke="#FFD700"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Checkmark for valid bearings */}
      {showCheckmark && (
        <g transform="translate(50, 130)">
          <circle cx="0" cy="0" r="10" fill="#FFD700" />
          <path
            d="M-5 0 L-2 4 L6 -4"
            fill="none"
            stroke="#000"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
    </g>
  );
}

export default WindIcon;
