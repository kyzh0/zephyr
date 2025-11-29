import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";

import { getStationTypeName } from "@/lib/utils";
import { useStationData, useMousePosition, type TimeRange } from "@/hooks";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Station() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [timeRange, setTimeRange] = useState<TimeRange>("12");

  const { station, data, tableData, bearingPairCount } = useStationData(
    id,
    timeRange
  );
  const mouseCoords = useMousePosition();

  const [hoveringOnInfoIcon, setHoveringOnInfoIcon] = useState(false);

  const tableRef = useRef<HTMLTableRowElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
      <DialogContent className="sm:max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col gap-0">
        <DialogHeader className="sticky pb-2">
          <DialogTitle className="text-center">
            {station ? (
              <div className="flex flex-col items-center">
                <span className="text-lg sm:text-xl font-semibold">
                  {station.name}
                </span>
                <span className="text-muted-foreground text-xs sm:text-sm font-normal">
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

        <div
          ref={containerRef}
          className="overflow-y-auto overflow-x-hidden flex-1"
          onClick={() => setHoveringOnInfoIcon(false)}
        >
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
              hoveringOnInfoIcon={hoveringOnInfoIcon}
              onInfoIconClick={(e) => {
                e.stopPropagation();
                setHoveringOnInfoIcon(!hoveringOnInfoIcon);
              }}
              onInfoIconHover={setHoveringOnInfoIcon}
            />
          ) : (
            <Skeleton width="100%" height={110} />
          )}

          {/* Data table and charts */}
          {station ? (
            station.isOffline ? null : data.length > 0 &&
              tableData.length > 0 ? (
              <div className="mt-4 space-y-4">
                <div className="flex flex-row items-center justify-end mb-2 text-sm text-muted-foreground gap-4">
                  Showing data for last{" "}
                  <Tabs
                    value={timeRange}
                    onValueChange={(v) => setTimeRange(v as TimeRange)}
                  >
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="24">24h</TabsTrigger>
                      <TabsTrigger value="12">12h</TabsTrigger>
                      <TabsTrigger value="6">6h</TabsTrigger>
                      <TabsTrigger value="3">3h</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <div className="overflow-x-auto">
                  <StationDataTable
                    ref={tableRef}
                    tableData={tableData}
                    validBearings={station.validBearings}
                  />
                </div>
                <WindSpeedChart data={data} />
                <div className="overflow-x-auto">
                  <WindDirectionChart
                    data={data}
                    bearingPairCount={bearingPairCount}
                  />
                </div>
              </div>
            ) : (
              <Skeleton width="100%" height={400} className="mt-4" />
            )
          ) : (
            <Skeleton width="100%" height={400} className="mt-4" />
          )}

          {/* Footer */}
          {station && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-[10px] sm:text-sm text-muted-foreground">
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
