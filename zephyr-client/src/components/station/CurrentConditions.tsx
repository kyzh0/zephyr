import { cn } from "@/lib/utils";
import { getWindColor } from "@/lib/utils";
import type { IStation } from "@/models/station.model";
import { WindCompass } from "./WindCompass";
import { convertWindSpeed, formatTemperature, getUnit } from "./utils";
import type { ScreenSize } from "./types";

interface CurrentConditionsProps {
  station: IStation;
  screenSize: ScreenSize;
  popupMessage?: string;
  hoveringOnInfoIcon: boolean;
  onInfoIconClick: (e: React.MouseEvent) => void;
  onInfoIconHover: (hovering: boolean) => void;
}

export function CurrentConditions({
  station,
  screenSize,
  hoveringOnInfoIcon,
  onInfoIconClick,
  onInfoIconHover,
}: CurrentConditionsProps) {
  const { bigScreen, tinyScreen, scaling } = screenSize;
  const unit = getUnit();

  if (station.isOffline) {
    return <p className="mt-2 text-center text-red-500">Station is offline.</p>;
  }

  return (
    <div
      className={cn(
        "flex w-full items-center justify-center gap-4",
        bigScreen ? "p-2 pb-3" : "p-1 pb-2"
      )}
    >
      {station.currentBearing != null &&
        (station.currentAverage != null || station.currentGust != null) && (
          <WindCompass
            bearing={station.currentBearing}
            validBearings={station.validBearings}
            scaling={scaling}
          />
        )}

      <div className="ml-3">
        <table className="w-[180px]">
          <tbody>
            <tr>
              <td className="p-0 text-center text-[10px]">Avg</td>
              <td className="p-0 text-center text-[10px]">Gust</td>
              <td className="p-0 text-center text-[10px]" />
            </tr>
            <tr>
              <td
                className={cn(
                  "text-center",
                  tinyScreen ? "text-lg" : "text-2xl",
                  bigScreen ? "p-1" : "p-0"
                )}
                style={{
                  backgroundColor: getWindColor(station.currentAverage ?? null),
                }}
              >
                {convertWindSpeed(station.currentAverage, unit) ?? "-"}
              </td>
              <td
                className={cn(
                  "text-center",
                  tinyScreen ? "text-lg" : "text-2xl",
                  bigScreen ? "p-1" : "p-0"
                )}
                style={{
                  backgroundColor: getWindColor(station.currentGust ?? null),
                }}
              >
                {convertWindSpeed(station.currentGust, unit) ?? "-"}
              </td>
              <td
                className={cn(
                  "p-0 text-center",
                  tinyScreen ? "text-sm" : "text-base"
                )}
              >
                {formatTemperature(station.currentTemperature)}
              </td>
              {station.popupMessage && (
                <td
                  className="cursor-pointer p-0 pl-1"
                  onClick={onInfoIconClick}
                  onMouseOver={() => onInfoIconHover(true)}
                  onMouseOut={() => onInfoIconHover(false)}
                >
                  <img
                    src="/caution.png"
                    className={cn(
                      "transition-opacity",
                      hoveringOnInfoIcon ? "opacity-30" : "opacity-100"
                    )}
                    style={{
                      width: scaling * 40,
                      height: scaling * 40,
                    }}
                    alt="Info"
                  />
                </td>
              )}
            </tr>
            <tr>
              <td colSpan={2} className="text-center text-[10px]">
                {unit === "kt" ? "kt" : "km/h"}
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
