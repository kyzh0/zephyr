import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line
} from 'recharts';
import type { ExtendedStationData } from './types';

interface WindDirectionChartProps {
  data: ExtendedStationData[];
  bearingPairCount: number;
}

const chartStyle = {
  fontSize: '12px',
  fontWeight: 400,
  fontFamily: 'Arial'
};

function formatBearingTick(value: number): string {
  switch (value) {
    case 0:
      return 'N';
    case 90:
      return 'E';
    case 180:
      return 'S';
    case 270:
      return 'W';
    case 360:
      return 'N';
    default:
      return '';
  }
}

export function WindDirectionChart({ data, bearingPairCount }: WindDirectionChartProps) {
  return (
    <div className="h-[20vh] min-h-[120px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timeLabel" tick={{ fill: 'black' }} style={chartStyle} />
          <YAxis
            width={20}
            interval={0}
            ticks={[0, 90, 180, 270, 360]}
            tickFormatter={formatBearingTick}
            tick={{ fill: 'black' }}
            style={chartStyle}
          />
          <Tooltip
            formatter={(value, name) => [
              name === 'vb' ? null : Math.round(Number(value)).toString().padStart(3, '0'),
              name === 'vb' ? null : 'Bearing'
            ]}
          />
          <Legend wrapperStyle={chartStyle} />
          <Line
            type="monotone"
            dataKey="windBearing"
            name="Direction"
            stroke="#8884d8"
            strokeWidth={0}
            dot={{ r: 1, strokeWidth: 2 }}
            isAnimationActive={false}
          />
          {[...Array(bearingPairCount).keys()].map((i) => (
            <Area
              key={i}
              type="monotone"
              dataKey={`validBearings${i}`}
              fill="rgba(192, 255, 191, 0.5)"
              stroke="none"
              activeDot={{ r: 0, stroke: 'none' }}
              legendType="none"
              name="vb"
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
