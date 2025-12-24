import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";
import { ArrowLeft, ChevronDown } from "lucide-react";

import { getMinutesAgo, getStationTypeName } from "@/lib/utils";
import {
  useStationData,
  useMousePosition,
  useIsMobile,
  type TimeRange,
} from "@/hooks";
import {
  useNearbyWebcams,
  type UseNearbyWebcamsResult,
} from "@/hooks/useWebcam";
import { useNearbySites, type UseNearbySitesResult } from "@/hooks/useSites";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

  const { webcams }: UseNearbyWebcamsResult = useNearbyWebcams({
    latitude: station?.location.coordinates[0] ?? 0,
    longitude: station?.location.coordinates[1] ?? 0,
    maxDistance: 10000, // 10km
  });

  const { sites }: UseNearbySitesResult = useNearbySites({
    latitude: station?.location.coordinates[0] ?? 0,
    longitude: station?.location.coordinates[1] ?? 0,
    maxDistance: 5000, // 5km
  });

  const [hoveringOnInfoIcon, setHoveringOnInfoIcon] = useState(false);
  const [webcamsOpen, setWebcamsOpen] = useState(false);
  const [sitesOpen, setSitesOpen] = useState(false);

  const tableRef = useRef<HTMLTableRowElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll table to latest data
  useEffect(() => {
    if (!tableRef.current || !containerRef.current) return;

    // First, ensure container is at top
    containerRef.current.scroll(0, 0);

    // Then scroll table horizontally to latest data
    const lastCell = tableRef.current.querySelector("td:last-child");
    if (lastCell) {
      lastCell.scrollIntoView({
        behavior: "smooth",
        inline: "end",
        block: "nearest",
      });
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
    <div className="space-y-1 sm:space-y-4">
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
          <>
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
          </>
        ) : (
          <Skeleton width="100%" height={400} className="mt-4" />
        )
      ) : (
        <Skeleton width="100%" height={400} className="mt-4" />
      )}

      {/* Nearby Webcams */}
      {station && webcams?.length > 0 && (
        <Collapsible open={webcamsOpen} onOpenChange={setWebcamsOpen}>
          <CollapsibleTrigger
            className={`flex items-center justify-between w-full py-2 text-sm font-medium hover:underline rounded px-3 ${
              webcamsOpen ? "bg-transparent" : "bg-muted mb-4"
            }`}
          >
            <span>Nearby Webcams ({webcams.length} within 10km)</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                webcamsOpen ? "rotate-180" : ""
              }`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2 flex flex-row flex-wrap gap-4">
            {webcams.map((webcam) => (
              <div
                key={String(webcam._id)}
                className="flex flex-col items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                onClick={() => navigate(`/webcams/${webcam._id}`)}
              >
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-1">
                  <span className="text-xs sm:text-sm font-medium">
                    {webcam.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {(webcam.distance / 1000).toFixed(1)}km away
                  </span>
                </div>
                {webcam.currentUrl && (
                  <img
                    src={`${import.meta.env.VITE_FILE_SERVER_PREFIX}/${
                      webcam.currentUrl
                    }`}
                    alt={webcam.name}
                    loading="lazy"
                    className="h-12 w-20 md:h-20 md:w-30 lg:w-80 lg:h-50 object-cover rounded"
                  />
                )}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Nearby Sites */}
      {station && sites?.length > 0 ? (
        <>
          <p>Sites</p>
          <Collapsible open={sitesOpen} onOpenChange={setSitesOpen}>
            <CollapsibleTrigger
              className={`flex items-center justify-between w-full py-2 text-sm font-medium hover:underline rounded px-3 ${
                sitesOpen ? "bg-transparent" : "bg-muted mb-4"
              }`}
            >
              <span>Nearby Sites ({sites.length} within 5km)</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  sitesOpen ? "rotate-180" : ""
                }`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2 flex flex-row flex-wrap gap-4">
              {sites.map((site) => (
                <div
                  key={String(site._id)}
                  className="flex flex-col items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => navigate(`/sites/${site._id}`)}
                >
                  <div className="flex flex-col sm:flex-row items-center sm:items-end gap-1">
                    <span className="text-xs sm:text-sm font-medium">
                      {site.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(site.distance / 1000).toFixed(1)}km away
                    </span>
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </>
      ) : (
        <p>No sites</p>
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
    </div>
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
              onClick={() => navigate(-1)}
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
    <Dialog open onOpenChange={() => navigate(-1)}>
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
