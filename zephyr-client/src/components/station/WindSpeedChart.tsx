import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getUnit } from "./utils";
import type { ExtendedStationData } from "./types";

interface WindSpeedChartProps {
  data: ExtendedStationData[];
}

const chartStyle = {
  fontSize: "12px",
  fontWeight: 200,
  fontFamily: "Arial",
};

export function WindSpeedChart({ data }: WindSpeedChartProps) {
  const unit = getUnit();

  return (
    <div className="h-[20vh] min-h-[120px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="timeLabel"
            tick={{ fill: "black" }}
            style={chartStyle}
          />
          <YAxis
            width={20}
            interval={0}
            tickCount={6}
            tick={{ fill: "black" }}
            style={chartStyle}
          />
          <Tooltip formatter={(value) => Math.round(Number(value))} />
          <Legend wrapperStyle={chartStyle} />
          <Line
            type="monotone"
            dataKey={unit === "kt" ? "windAverageKt" : "windAverage"}
            name={`Avg (${unit === "kt" ? "kt" : "km/h"})`}
            stroke="#8884d8"
            dot={{ r: 0 }}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey={unit === "kt" ? "windGustKt" : "windGust"}
            name={`Gust (${unit === "kt" ? "kt" : "km/h"})`}
            stroke="#ffa894"
            dot={{ r: 0 }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
