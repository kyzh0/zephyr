import { forwardRef } from "react";
import { cn, getWindColor, getWindDirectionFromBearing } from "@/lib/utils";
import { getDirectionColor, convertWindSpeed, getUnit } from "./utils";
import { DirectionArrow } from "@/components/ui/DirectionArrow";
import type { ExtendedStationData, ScreenSize } from "./types";

interface StationDataTableProps {
  tableData: ExtendedStationData[];
  validBearings: string | undefined;
  screenSize: ScreenSize;
}

export const StationDataTable = forwardRef<
  HTMLTableRowElement,
  StationDataTableProps
>(function StationDataTable({ tableData, validBearings, screenSize }, ref) {
  const { bigScreen, tinyScreen } = screenSize;
  const unit = getUnit();

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-lg border bg-white",
        tinyScreen && "min-h-[122px]"
      )}
    >
      <table className="min-w-[650px] text-sm">
        <tbody>
          {/* Time row */}
          <tr ref={ref}>
            <th className="sticky left-0 bg-white" />
            {tableData.map((d) => (
              <td
                key={String(d.time)}
                className={cn(
                  "text-center",
                  bigScreen ? "p-0.5" : "px-0.5 py-0",
                  tinyScreen ? "text-[10px]" : "text-xs",
                  new Date(d.time).getMinutes() === 0 && "bg-gray-200"
                )}
              >
                {d.timeLabel}
              </td>
            ))}
          </tr>

          {/* Average row */}
          <tr>
            <th
              className={cn(
                "sticky left-0 bg-white text-left",
                tinyScreen && "text-xs",
                bigScreen ? "p-0.5" : "py-0 pl-0.5 pr-0"
              )}
            >
              Avg
            </th>
            {tableData.map((d) => (
              <td
                key={String(d.time)}
                className={cn(
                  "text-center",
                  tinyScreen && "text-xs",
                  bigScreen ? "p-0.5" : "p-0"
                )}
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
            <th
              className={cn(
                "sticky left-0 bg-white text-left",
                tinyScreen && "text-xs",
                bigScreen ? "p-0.5" : "py-0 pl-0.5 pr-0"
              )}
            >
              Gust
            </th>
            {tableData.map((d) => (
              <td
                key={String(d.time)}
                className={cn(
                  "text-center",
                  tinyScreen && "text-xs",
                  bigScreen ? "p-0.5" : "p-0"
                )}
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
                className={cn(
                  "text-center",
                  tinyScreen && "text-[10px]",
                  bigScreen ? "p-0.5" : "p-0"
                )}
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
            <th className="sticky left-0 bg-white" />
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
                        transform: `rotate(${Math.round(d.windBearing)}deg)`,
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
                className={cn(
                  "text-center text-[10px]",
                  bigScreen ? "p-0.5" : "p-0"
                )}
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
                className={cn(
                  "text-center",
                  tinyScreen ? "text-[8px]" : "text-[10px]",
                  bigScreen ? "p-0.5" : "p-0"
                )}
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
});
