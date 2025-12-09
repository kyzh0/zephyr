import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getWindColor } from "@/lib/utils";
import type { IStation } from "@/models/station.model";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  if (station.isOffline) {
    return <p className="mt-2 text-center text-red-500">Station is offline.</p>;
  }

  return (
    <div
      ref={containerRef}
      className="flex w-full items-center justify-center gap-6 sm:gap-8 overflow-x-auto flex-grow min-h-[10vw]"
    >
      {station.currentBearing != null &&
        (station.currentAverage != null || station.currentGust != null) && (
          <WindCompass
            bearing={station.currentBearing}
            validBearings={station.validBearings}
            containerSize={containerSize}
          />
        )}
      <table>
        <tbody>
          <tr>
            <td className="p-0 text-center text-muted-foreground text-xs sm:text-sm px-2">
              Avg
            </td>
            <td className="p-0 text-center text-muted-foreground text-xs sm:text-sm px-2">
              Gust
            </td>
            <td className="p-0 text-center text-muted-foreground text-xs sm:text-sm px-2" />
          </tr>
          <tr className="h-15 sm:h-20">
            <td
              className="text-center p-0 sm:p-1 text-xl sm:text-2xl"
              style={{
                backgroundColor: getWindColor(station.currentAverage ?? null),
              }}
            >
              {convertWindSpeed(station.currentAverage, unit) ?? "-"}
            </td>
            <td
              className="text-center p-0 sm:p-1 text-xl sm:text-2xl"
              style={{
                backgroundColor: getWindColor(station.currentGust ?? null),
              }}
            >
              {convertWindSpeed(station.currentGust, unit) ?? "-"}
            </td>
            <td className="p-0 text-center text-sm sm:text-base px-2">
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
            <td colSpan={2} className="text-center text-xs sm:text-sm">
              {unit === "kt" ? "kt" : "km/h"}
            </td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
