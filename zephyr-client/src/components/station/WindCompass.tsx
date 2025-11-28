interface WindCompassProps {
  bearing: number | null | undefined;
  validBearings: string | undefined;
}

export function WindCompass({ bearing, validBearings }: WindCompassProps) {
  const size = 120;
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
        strokeWidth="2"
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
        const x1 = centerX + (radius - 8) * Math.cos(rad);
        const y1 = centerY + (radius - 8) * Math.sin(rad);
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
            strokeWidth="2"
          />
        );
      })}

      {/* Cardinal direction labels */}
      {[
        { angle: 0, label: "N" },
        { angle: 90, label: "E" },
        { angle: 180, label: "S" },
        { angle: 270, label: "W" },
      ].map(({ angle, label }) => {
        const rad = ((angle - 90) * Math.PI) / 180;
        const x = centerX + (radius + 15) * Math.cos(rad);
        const y = centerY + (radius + 15) * Math.sin(rad);

        return (
          <text
            key={angle}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={12}
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
                  transform="scale(2)"
                />
              </g>
            );
          })()}
        </g>
      )}
      <circle cx={centerX} cy={centerY} r="3" fill="#333" />
    </svg>
  );
}
