import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";
import { ArrowLeft } from "lucide-react";

import { getMinutesAgo, getStationTypeName } from "@/lib/utils";
import {
  useStationData,
  useMousePosition,
  useIsMobile,
  type TimeRange,
} from "@/hooks";
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
import { Button } from "@/components/ui/button";
import { addRecentStation } from "@/services/recentStations.service";

export default function Station() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [timeRange, setTimeRange] = useState<TimeRange>("6");

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

  // Track recently viewed station
  useEffect(() => {
    if (station && id) {
      addRecentStation(id, station.name);
    }
  }, [station, id]);

  // Shared header content
  const headerContent = station ? (
    <div className="flex flex-col items-center">
      <span className="text-lg sm:text-xl font-semibold leading-tight">
        {station.name}
      </span>
      <span className="text-muted-foreground text-xs sm:text-sm font-normal">
        Elevation {station.elevation}m • Updated{" "}
        {station.lastUpdate
          ? `${getMinutesAgo(new Date(station.lastUpdate))}`
          : ""}
      </span>
    </div>
  ) : (
    <div
      className="animate-pulse rounded bg-gray-200 mx-auto"
      style={{ width: 180, height: 40 }}
    />
  );

  // Shared body content
  const bodyContent = (
    <>
      {/* Info popup */}
      {hoveringOnInfoIcon && station?.popupMessage && (
        <InfoPopup message={station.popupMessage} mouseCoords={mouseCoords} />
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
        station.isOffline ? null : data.length > 0 && tableData.length > 0 ? (
          <div className="space-y-1 sm:space-y-4">
            <div className="flex flex-row items-center justify-end text-xs sm:text-sm text-muted-foreground gap-2 sm:gap-4">
              Showing data for last{" "}
              <Tabs
                value={timeRange}
                onValueChange={(v) => setTimeRange(v as TimeRange)}
              >
                <TabsList className="grid w-full grid-cols-4 h-7 sm:h-9">
                  <TabsTrigger value="24" className="text-xs sm:text-sm">
                    24h
                  </TabsTrigger>
                  <TabsTrigger value="12" className="text-xs sm:text-sm">
                    12h
                  </TabsTrigger>
                  <TabsTrigger value="6" className="text-xs sm:text-sm">
                    6h
                  </TabsTrigger>
                  <TabsTrigger value="3" className="text-xs sm:text-sm">
                    3h
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <StationDataTable
              ref={tableRef}
              tableData={tableData}
              validBearings={station.validBearings}
            />
            <WindSpeedChart data={data} />
            <WindDirectionChart
              data={data}
              bearingPairCount={bearingPairCount}
            />
          </div>
        ) : (
          <Skeleton width="100%" height={400} className="mt-4" />
        )
      ) : (
        <Skeleton width="100%" height={400} className="mt-4" />
      )}

      {/* Footer */}
      {station && (
        <div className="flex items-center justify-between">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Updated{" "}
            {formatInTimeZone(
              new Date(station.lastUpdate),
              "Pacific/Auckland",
              "HH:mm"
            )}
            {" ("}
            {getMinutesAgo(new Date(station.lastUpdate))}
            {")"}
          </p>
          <a
            href={station.externalLink}
            target="_blank"
            rel="noreferrer"
            className="text-xs sm:text-sm text-muted-foreground underline"
          >
            Source: {getStationTypeName(station.type)}
          </a>
        </div>
      )}
    </>
  );

  // Mobile: Full-screen layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background p-4 pb-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 text-center pr-10">{headerContent}</div>
          </div>
        </div>

        {/* Body */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto px-2 sm:px-4 py-2 sm:py-4 flex flex-col justify-between gap-2 sm:gap-4"
          onClick={() => setHoveringOnInfoIcon(false)}
        >
          {bodyContent}
        </div>
      </div>
    );
  }

  // Desktop: Dialog overlay
  return (
    <Dialog open onOpenChange={() => navigate("/")}>
      <DialogContent className="sm:max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col gap-0">
        <DialogHeader className="sticky pb-2">
          <DialogTitle className="text-center">{headerContent}</DialogTitle>
        </DialogHeader>

        <div
          ref={containerRef}
          className="overflow-y-auto overflow-x-hidden flex-1"
          onClick={() => setHoveringOnInfoIcon(false)}
        >
          {bodyContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}
