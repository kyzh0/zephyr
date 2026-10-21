import type { StationData } from '@/models/station-data.model';

interface WindTrendSparklineProps {
  data: StationData[];
}

interface TrendPoint {
  x: number;
  y: number;
  windAverage: number | null;
}

const VIEWBOX_WIDTH = 100;
const VIEWBOX_HEIGHT = 40;
const PADDING = 4;

export function WindTrendSparkline({ data }: WindTrendSparklineProps) {
  const chartData = data.filter((item) => Number.isFinite(new Date(item.time).getTime()));
  const validData = chartData.filter(
    (item) => item.windAverage != null && Number.isFinite(item.windAverage)
  );

  if (validData.length < 2 || chartData.length < 2) {
    return null;
  }

  const times = chartData.map((item) => new Date(item.time).getTime());
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const windSpeeds = validData.map((item) => item.windAverage!);
  const minWindSpeed = Math.min(...windSpeeds);
  const maxWindSpeed = Math.max(...windSpeeds);
  const xRange = maxTime - minTime;
  const yRange = maxWindSpeed - minWindSpeed;

  const points: TrendPoint[] = chartData.map((item) => {
    const time = new Date(item.time).getTime();
    const windAverage =
      item.windAverage != null && Number.isFinite(item.windAverage) ? item.windAverage : null;
    const x =
      xRange === 0
        ? VIEWBOX_WIDTH / 2
        : PADDING + ((time - minTime) / xRange) * (VIEWBOX_WIDTH - PADDING * 2);
    const y =
      windAverage == null || !Number.isFinite(windAverage)
        ? 0
        : yRange === 0
          ? VIEWBOX_HEIGHT / 2
          : VIEWBOX_HEIGHT -
            PADDING -
            ((windAverage - minWindSpeed) / yRange) * (VIEWBOX_HEIGHT - PADDING * 2);

    return { x, y, windAverage };
  });

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-75"
      preserveAspectRatio="none"
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
    >
      {points.slice(1).map((point, index) => {
        const previousPoint = points[index];
        if (previousPoint.windAverage == null || point.windAverage == null) {
          return null;
        }

        return (
          <line
            key={`${previousPoint.x}-${previousPoint.y}-${point.x}-${point.y}`}
            stroke="#00000057"
            strokeLinecap="round"
            strokeWidth="0.3"
            x1={previousPoint.x}
            x2={point.x}
            y1={previousPoint.y}
            y2={point.y}
          />
        );
      })}
    </svg>
  );
}
