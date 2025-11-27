import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";

import { cn, getStationTypeName } from "@/lib/utils";
import { useStationData, useScreenSize, useMousePosition } from "@/hooks";
import {
  CurrentConditions,
  StationDataTable,
  WindSpeedChart,
  WindDirectionChart,
  InfoPopup,
  Skeleton,
} from "@/components/station";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Station() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { station, data, tableData, bearingPairCount } = useStationData(id);
  const screenSize = useScreenSize();
  const mouseCoords = useMousePosition();

  const [hoveringOnInfoIcon, setHoveringOnInfoIcon] = useState(false);

  const tableRef = useRef<HTMLTableRowElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { bigScreen, scaling } = screenSize;

  // Auto-scroll table to latest data
  useEffect(() => {
    if (!tableRef.current) return;

    const lastCell = tableRef.current.querySelector("td:last-child");
    if (lastCell) {
      lastCell.scrollIntoView({ behavior: "smooth", inline: "end" });
    }

    if (containerRef.current) {
      containerRef.current.scroll(0, 0);
    }
  }, [data]);

  return (
    <Dialog open onOpenChange={() => navigate("/")}>
      <DialogContent className="sm:max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            {station ? (
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "text-xl font-semibold",
                    !bigScreen && "text-lg"
                  )}
                >
                  {station.name}
                </span>
                <span
                  className={cn(
                    "text-muted-foreground text-sm font-normal",
                    !bigScreen && "text-xs"
                  )}
                >
                  Elevation {station.elevation}m
                </span>
              </div>
            ) : (
              <div
                className="animate-pulse rounded bg-gray-200 mx-auto"
                style={{ width: 180, height: 40 }}
              />
            )}
          </DialogTitle>
        </DialogHeader>

        <div ref={containerRef} onClick={() => setHoveringOnInfoIcon(false)}>
          {/* Info popup */}
          {hoveringOnInfoIcon && station?.popupMessage && (
            <InfoPopup
              message={station.popupMessage}
              mouseCoords={mouseCoords}
            />
          )}

          {/* Current conditions */}
          {station ? (
            <CurrentConditions
              station={station}
              screenSize={screenSize}
              hoveringOnInfoIcon={hoveringOnInfoIcon}
              onInfoIconClick={(e) => {
                e.stopPropagation();
                setHoveringOnInfoIcon(!hoveringOnInfoIcon);
              }}
              onInfoIconHover={setHoveringOnInfoIcon}
            />
          ) : (
            <Skeleton width="100%" height={scaling * 110} />
          )}

          {/* Data table and charts */}
          {station ? (
            station.isOffline ? null : data.length > 0 &&
              tableData.length > 0 ? (
              <div className="mt-4 space-y-4">
                <div className="overflow-x-auto">
                  <StationDataTable
                    ref={tableRef}
                    tableData={tableData}
                    validBearings={station.validBearings}
                    screenSize={screenSize}
                  />
                </div>
                <WindSpeedChart data={data} />
                <WindDirectionChart
                  data={data}
                  bearingPairCount={bearingPairCount}
                />
              </div>
            ) : (
              <Skeleton width="100%" height={scaling * 400} className="mt-4" />
            )
          ) : (
            <Skeleton width="100%" height={scaling * 400} className="mt-4" />
          )}

          {/* Footer */}
          {station && (
            <div className="mt-4 flex items-center justify-between">
              <p
                className={cn(
                  "text-sm text-muted-foreground",
                  !bigScreen && "text-[10px]"
                )}
              >
                Updated{" "}
                {formatInTimeZone(
                  new Date(station.lastUpdate),
                  "Pacific/Auckland",
                  "HH:mm"
                )}
              </p>
              <a
                href={station.externalLink}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-muted-foreground hover:underline"
              >
                Source: {getStationTypeName(station.type)}
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
