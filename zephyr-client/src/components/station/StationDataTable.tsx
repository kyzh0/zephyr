import { cn, getWindColor, getWindDirectionFromBearing } from "@/lib/utils";
import { getDirectionColor, convertWindSpeed, getUnit } from "./utils";
import { DirectionArrow } from "@/components/ui/DirectionArrow";
import type { ExtendedStationData } from "./types";

interface StationDataTableProps {
  tableData: ExtendedStationData[];
  validBearings: string | undefined;
}

export const StationDataTable = function StationDataTable({
  ref,
  tableData,
  validBearings,
}: StationDataTableProps & {
  ref?: React.RefObject<HTMLTableRowElement | null>;
}) {
  const unit = getUnit();

  return (
    <div className="overflow-x-auto rounded-lg border bg-white sm:min-h-0">
      <table className="min-w-[650px] text-sm">
        <tbody>
          {/* Time row */}
          <tr ref={ref}>
            <th className="sticky left-0 bg-white" />
            {tableData.map((d) => (
              <td
                key={String(d.time)}
                className={cn(
                  "text-center text-muted-foreground px-0.5 py-0 sm:p-0.5 text-xs sm:text-sm",
                  new Date(d.time).getMinutes() === 0 &&
                    "bg-gray-300 text-color-base"
                )}
              >
                {d.timeLabel}
              </td>
            ))}
          </tr>

          {/* Average row */}
          <tr>
            <th className="sticky left-0 bg-white text-left text-xs sm:text-sm py-0 pl-0.5 pr-0.5 sm:p-0.8">
              Avg
            </th>
            {tableData.map((d) => (
              <td
                key={String(d.time)}
                className="text-center text-xs sm:text-sm p-0 sm:p-0.5"
                style={{
                  backgroundColor: getWindColor(d.windAverage ?? null),
                }}
              >
                {convertWindSpeed(d.windAverage, unit) ?? "-"}
              </td>
            ))}
          </tr>

          {/* Gust row */}
          <tr>
            <th className="sticky left-0 bg-white text-left text-xs sm:text-sm py-0 pl-0.5 pr-0.5 sm:p-0.8">
              Gust
            </th>
            {tableData.map((d) => (
              <td
                key={String(d.time)}
                className="text-center text-xs sm:text-sm p-0 sm:p-0.5"
                style={{
                  backgroundColor: getWindColor(d.windGust ?? null),
                }}
              >
                {convertWindSpeed(d.windGust, unit) ?? "-"}
              </td>
            ))}
          </tr>

          {/* Direction text row */}
          <tr>
            <th className="sticky left-0 bg-white" />
            {tableData.map((d) => (
              <td
                key={String(d.time)}
                className="text-center text-muted-foreground text-xs sm:text-sm p-0 sm:p-0.5"
              >
                {d.windBearing == null ||
                (d.windAverage == null && d.windGust == null)
                  ? ""
                  : getWindDirectionFromBearing(d.windBearing)}
              </td>
            ))}
          </tr>

          {/* Direction arrow row */}
          <tr>
            <th className="sticky left-0 bg-white z-10" />
            {tableData.map((d) => (
              <td
                key={String(d.time)}
                className="p-0 text-center"
                style={{
                  background: getDirectionColor(
                    d.windAverage == null && d.windGust == null
                      ? null
                      : d.windBearing,
                    validBearings
                  ),
                }}
              >
                {d.windBearing == null ||
                (d.windAverage == null && d.windGust == null) ? (
                  "-"
                ) : (
                  <div className="flex items-center justify-center">
                    <DirectionArrow
                      className="h-4 w-4"
                      style={{
                        transform: `rotate(${Math.round(
                          180 + d.windBearing
                        )}deg)`,
                      }}
                    />
                  </div>
                )}
              </td>
            ))}
          </tr>

          {/* Bearing degrees row */}
          <tr>
            <th className="sticky left-0 bg-white" />
            {tableData.map((d) => (
              <td
                key={String(d.time)}
                className="text-center text-muted-foreground text-xs sm:text-sm p-0 sm:p-0.5"
              >
                {d.windBearing == null ||
                (d.windAverage == null && d.windGust == null)
                  ? ""
                  : `${Math.round(d.windBearing).toString().padStart(3, "0")}°`}
              </td>
            ))}
          </tr>

          {/* Temperature row */}
          <tr>
            <th className="sticky left-0 bg-white" />
            {tableData.map((d) => (
              <td
                key={String(d.time)}
                className="text-center text-muted-foreground text-xs sm:text-sm p-0 sm:p-0.5"
              >
                {d.temperature == null
                  ? "-"
                  : `${Math.round(d.temperature * 10) / 10}°C`}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};
