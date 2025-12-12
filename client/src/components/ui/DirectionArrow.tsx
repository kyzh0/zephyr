interface DirectionArrowProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Simple directional arrow SVG
 * Points upward by default, rotate to show wind direction
 * Uses the same arrow shape as WindCompass
 */
export function DirectionArrow({ className, style }: DirectionArrowProps) {
  return (
    <svg
      viewBox="-7 -20 14 25"
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon points="0,-20 7,5 0,0 -7,5" fill="currentColor" />
    </svg>
  );
}

export default DirectionArrow;
