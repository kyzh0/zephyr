import { cn } from "@/lib/utils";
import { getWindColor } from "@/lib/utils";
import type { IStation } from "@/models/station.model";
import { useIsMobile } from "@/hooks";
import { WindCompass } from "./WindCompass";
import { convertWindSpeed, formatTemperature, getUnit } from "./utils";

interface CurrentConditionsProps {
  station: IStation;
  popupMessage?: string;
  hoveringOnInfoIcon: boolean;
  onInfoIconClick: (e: React.MouseEvent) => void;
  onInfoIconHover: (hovering: boolean) => void;
}

export function CurrentConditions({
  station,
  hoveringOnInfoIcon,
  onInfoIconClick,
  onInfoIconHover,
}: CurrentConditionsProps) {
  const unit = getUnit();
  const isMobile = useIsMobile();

  if (station.isOffline) {
    return <p className="mt-2 text-center text-red-500">Station is offline.</p>;
  }

  return (
    <div className="flex w-full items-center justify-center gap-2 sm:gap-4 overflow-x-auto p-0.5 pb-1 sm:p-2 sm:pb-3">
      {station.currentBearing != null &&
        (station.currentAverage != null || station.currentGust != null) && (
          <WindCompass
            bearing={station.currentBearing}
            validBearings={station.validBearings}
            isMobile={isMobile}
          />
        )}

      <div className="ml-1 sm:ml-3">
        <table className="w-[150px] sm:w-[180px]">
          <tbody>
            <tr>
              <td className="p-0 text-center text-[9px] sm:text-[10px]">Avg</td>
              <td className="p-0 text-center text-[9px] sm:text-[10px]">
                Gust
              </td>
              <td className="p-0 text-center text-[9px] sm:text-[10px]" />
            </tr>
            <tr>
              <td
                className="text-center p-0 sm:p-1 text-base sm:text-2xl"
                style={{
                  backgroundColor: getWindColor(station.currentAverage ?? null),
                }}
              >
                {convertWindSpeed(station.currentAverage, unit) ?? "-"}
              </td>
              <td
                className="text-center p-0 sm:p-1 text-base sm:text-2xl"
                style={{
                  backgroundColor: getWindColor(station.currentGust ?? null),
                }}
              >
                {convertWindSpeed(station.currentGust, unit) ?? "-"}
              </td>
              <td className="p-0 text-center text-xs sm:text-base">
                {formatTemperature(station.currentTemperature)}
              </td>
              {station.popupMessage && (
                <td
                  className="cursor-pointer p-0 pl-0.5 sm:pl-1"
                  onClick={onInfoIconClick}
                  onMouseOver={() => onInfoIconHover(true)}
                  onMouseOut={() => onInfoIconHover(false)}
                >
                  <img
                    src="/caution.png"
                    className={cn(
                      "transition-opacity w-6 h-6 sm:w-10 sm:h-10",
                      hoveringOnInfoIcon ? "opacity-30" : "opacity-100"
                    )}
                    alt="Info"
                  />
                </td>
              )}
            </tr>
            <tr>
              <td colSpan={2} className="text-center text-[9px] sm:text-[10px]">
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
