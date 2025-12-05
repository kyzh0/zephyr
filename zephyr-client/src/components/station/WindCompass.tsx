interface WindCompassProps {
  bearing: number | null | undefined;
  validBearings: string | undefined;
  containerSize?: { width: number; height: number } | null;
}

export function WindCompass({
  bearing,
  validBearings,
  containerSize,
}: WindCompassProps) {
  // Calculate size based on container, with fallback to fixed sizes
  const calculateSize = () => {
    if (containerSize) {
      // Use the smaller dimension, accounting for padding and other elements
      // Reserve space for the table (roughly 180-200px on desktop, 150-170px on mobile)
      const tableWidth = 200;
      const availableWidth = containerSize.width - tableWidth - 40; // 40px for gaps/padding
      const availableHeight = containerSize.height - 20; // Some vertical padding

      // Use the smaller of available width/height, with min/max constraints
      const minSize = 90;
      const maxSize = 160;

      const calculatedSize = Math.min(availableWidth, availableHeight);
      return Math.max(minSize, Math.min(maxSize, calculatedSize));
    }
    // Fallback to original fixed sizes
    return 90;
  };

  const size = calculateSize();
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.4;

  // Parse valid bearings to create sectors
  const createValidBearingSectors = () => {
    if (!validBearings) {
      return [];
    }

    const sectors: { start: number; end: number }[] = [];
    const pairs = validBearings.split(",");

    for (const pair of pairs) {
      const bearings = pair.split("-");
      if (bearings.length === 2) {
        const start = Number(bearings[0]);
        const end = Number(bearings[1]);

        if (start <= end) {
          sectors.push({ start, end });
        } else {
          sectors.push({ start, end: 360 });
          sectors.push({ start: 0, end });
        }
      }
    }
    return sectors;
  };

  const createSectorPath = (startAngle: number, endAngle: number) => {
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      "Z",
    ].join(" ");
  };

  const validSectors = createValidBearingSectors();

  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      {/* Background circle */}
      <circle
        cx={centerX}
        cy={centerY}
        r={radius}
        fill="#c4ebfa"
        stroke="#333"
        strokeWidth={Math.max(1.5, size / 60)}
      />

      {/* Valid bearing sectors */}
      {validSectors.map((sector, index) => (
        <path
          // eslint-disable-next-line react-x/no-array-index-key
          key={index}
          d={createSectorPath(sector.start, sector.end)}
          fill="rgba(34, 139, 34, 0.46)"
          stroke="none"
        />
      ))}

      {/* Compass marks */}
      {[0, 90, 180, 270].map((angle) => {
        const rad = ((angle - 90) * Math.PI) / 180;
        const markLength = size * 0.067; // Proportional mark length (was 8 at size 120)
        const x1 = centerX + (radius - markLength) * Math.cos(rad);
        const y1 = centerY + (radius - markLength) * Math.sin(rad);
        const x2 = centerX + radius * Math.cos(rad);
        const y2 = centerY + radius * Math.sin(rad);

        return (
          <line
            key={angle}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#333"
            strokeWidth={Math.max(1.5, size / 60)}
          />
        );
      })}

      {/* Cardinal direction labels */}
      {size > 90 &&
        [
          { angle: 0, label: "N" },
          { angle: 90, label: "E" },
          { angle: 180, label: "S" },
          { angle: 270, label: "W" },
        ].map(({ angle, label }) => {
          const rad = ((angle - 90) * Math.PI) / 180;
          const labelOffset = size * 0.125; // Proportional offset (was 15 at size 120)
          const x = centerX + (radius + labelOffset) * Math.cos(rad);
          const y = centerY + (radius + labelOffset) * Math.sin(rad);
          const fontSize = Math.max(10, size * 0.1); // Proportional font size

          return (
            <text
              key={angle}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fontSize}
              fontWeight="bold"
              fill="#333"
            >
              {label}
            </text>
          );
        })}

      {/* Wind direction arrow */}
      {bearing != null && (
        <g>
          {(() => {
            const bearingRad = ((bearing - 90) * Math.PI) / 180;
            const edgeX = centerX + radius * Math.cos(bearingRad);
            const edgeY = centerY + radius * Math.sin(bearingRad);
            // Scale arrow proportionally to SVG size (base size was 120)
            const arrowScale = (size / 120) * 2;

            return (
              <g
                transform={`translate(${edgeX}, ${edgeY}) rotate(${
                  bearing + 180
                })`}
              >
                <polygon
                  points="0,-20 5,5 0,0 -5,5"
                  fill="#FFD700"
                  stroke="#333"
                  strokeWidth="1"
                  transform={`scale(${arrowScale})`}
                />
              </g>
            );
          })()}
        </g>
      )}
      <circle
        cx={centerX}
        cy={centerY}
        r={Math.max(2, size * 0.025)}
        fill="#333"
      />
    </svg>
  );
}
