interface DirectionArrowProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Simple directional arrow SVG - replaces arrow.png
 * Points upward by default, rotate to show wind direction
 */
export function DirectionArrow({ className, style }: DirectionArrowProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2 L4 14 L10 14 L10 22 L14 22 L14 14 L20 14 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default DirectionArrow;
