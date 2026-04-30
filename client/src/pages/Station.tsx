import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatInTimeZone } from 'date-fns-tz';
import { toast } from 'sonner';
import { ArrowLeft, Bell, ChevronDown, Link2 } from 'lucide-react';

import SEO from '@/components/SEO';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { WebcamPreview } from '@/components/webcam/WebcamPreview';
import {
  CurrentConditions,
  StationDataTable,
  WindSpeedChart,
  WindDirectionChart,
  InfoPopup,
  Skeleton
} from '@/components/station';

import {
  getButtonStyle,
  getIconStyle,
  getMinutesAgo,
  getStationTypeName,
  REFRESH_INTERVAL_MS
} from '@/lib/utils';
import { ApiError } from '@/services/api-error';
import {
  useStationData,
  useIsMobile,
  useNearbyWebcams,
  useNearbySites,
  type TimeRange
} from '@/hooks';
import { useAppStore } from '@/store';

const isStandalone =
  typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;

function TimeSince({ date }: { date: string | Date }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
  return <>{getMinutesAgo(new Date(date))}</>;
}

export default function Station() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const flyingMode = useAppStore((s) => s.flyingMode);

  const [timeRange, setTimeRange] = useState<TimeRange>('6');

  const { station, tableData, bearingPairCount, error } = useStationData(id, timeRange);

  // Navigate back if station not found
  useEffect(() => {
    if (error instanceof ApiError && error.status === 404) navigate('/', { replace: true });
  }, [error, navigate]);

  const { data: nearbyWebcamData } = useNearbyWebcams({
    lon: station?.location.coordinates[0] ?? 0,
    lat: station?.location.coordinates[1] ?? 0
  });

  const { data: nearbySitesData } = useNearbySites({
    lon: station?.location.coordinates[0] ?? 0,
    lat: station?.location.coordinates[1] ?? 0,
    maxDistance: 5000 // 5km
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
    const lastCell = tableRef.current.querySelector('td:last-child');
    if (lastCell) {
      lastCell.scrollIntoView({
        behavior: 'smooth',
        inline: 'end',
        block: 'nearest'
      });
    }
  }, [tableData]);

  // Track recently viewed station
  useEffect(() => {
    if (station && id) {
      useAppStore.getState().addRecentStation(id, station.name);
    }
  }, [station, id]);

  const stationDescription = station
    ? `Live wind data for ${station.name}, updated every minute.`
    : `Live wind data, updated every minute.`;

  // Shared header content
  const headerContent = station ? (
    <div className="flex flex-col items-center">
      <span className="text-lg sm:text-xl font-semibold leading-tight">{station.name}</span>
      <span className="text-muted-foreground text-xs sm:text-sm font-normal">
        Elevation {station.elevation}m • Updated{' '}
        {station.lastUpdate ? <TimeSince date={station.lastUpdate} /> : ''}
      </span>
    </div>
  ) : (
    <div className="animate-pulse rounded bg-gray-200 mx-auto" style={{ width: 180, height: 40 }} />
  );

  // Shared body content
  const bodyContent = (
    <div className="space-y-1 sm:space-y-4">
      {/* Info popup */}
      {hoveringOnInfoIcon && station?.popupMessage && <InfoPopup message={station.popupMessage} />}

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
        station.isOffline ? null : tableData.length > 0 ? (
          <>
            <StationDataTable
              ref={tableRef}
              tableData={tableData}
              validBearings={station.validBearings}
            />
            <WindSpeedChart data={tableData} />
            <WindDirectionChart data={tableData} bearingPairCount={bearingPairCount} />
            <div className="flex flex-row items-center justify-end text-xs sm:text-sm text-muted-foreground gap-2 sm:gap-4">
              Showing data for last{' '}
              <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
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
          </>
        ) : (
          <Skeleton width="100%" height={400} className="mt-4" />
        )
      ) : (
        <Skeleton width="100%" height={400} className="mt-4" />
      )}

      {/* Nearby Webcams */}
      {station && nearbyWebcamData?.length > 0 && (
        <Collapsible open={webcamsOpen} onOpenChange={setWebcamsOpen} className="mb-2">
          <CollapsibleTrigger
            className={`flex items-center justify-between w-full py-2 text-sm font-medium hover:underline rounded px-3 ${
              webcamsOpen ? 'bg-transparent' : 'bg-muted'
            }`}
          >
            <span>Nearby Webcams ({nearbyWebcamData.length} within 5km)</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${webcamsOpen ? 'rotate-180' : ''}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2 flex flex-row flex-wrap gap-4">
            {nearbyWebcamData.map((nearbyWebcamData) => (
              <WebcamPreview
                key={nearbyWebcamData.data._id}
                _id={nearbyWebcamData.data._id}
                name={nearbyWebcamData.data.name}
                distance={nearbyWebcamData.distance}
                currentUrl={nearbyWebcamData.data.currentUrl}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Nearby Sites */}
      {station && nearbySitesData?.length > 0 && (
        <Collapsible open={sitesOpen} onOpenChange={setSitesOpen} className="mb-2">
          <CollapsibleTrigger
            className={`flex items-center justify-between w-full py-2 text-sm font-medium hover:underline rounded px-3 ${
              sitesOpen ? 'bg-transparent' : 'bg-muted'
            }`}
          >
            <span>Nearby Sites ({nearbySitesData.length} within 5km)</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${sitesOpen ? 'rotate-180' : ''}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="list-disc list-inside ml-8">
              {nearbySitesData.map((nearbySiteData) => (
                <li key={String(nearbySiteData.data._id)}>
                  <Link
                    to={`/sites/${nearbySiteData.data._id}`}
                    className="underline cursor-pointer hover:text-blue-600"
                  >
                    {nearbySiteData.data.name} ({(nearbySiteData.distance / 1000).toFixed(1)}km
                    away)
                  </Link>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Footer */}
      {station && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Updated {formatInTimeZone(new Date(station.lastUpdate), 'Pacific/Auckland', 'HH:mm')}
            {' ('}
            <TimeSince date={station.lastUpdate} />
            {')'}
          </p>
          {station.type !== 'metservice' && (
            <a
              href={station.externalLink}
              target="_blank"
              rel="noreferrer"
              className="text-xs sm:text-sm text-muted-foreground hover:underline"
            >
              Source: {getStationTypeName(station.type)}
            </a>
          )}
        </div>
      )}
    </div>
  );

  // Mobile: Full-screen layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col z-100">
        {station && (
          <SEO title={station.name} description={stationDescription} path={`/stations/${id}`} />
        )}
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background p-4 pb-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
              className={getButtonStyle(flyingMode)}
            >
              <ArrowLeft className={getIconStyle(flyingMode)} />
            </Button>
            <div className={`flex-1 text-center ${isStandalone ? '' : 'mr-10'}`}>
              {headerContent}
            </div>
            {isStandalone && (
              <Button
                variant="ghost"
                size="icon"
                className={getButtonStyle(flyingMode)}
                onClick={() =>
                  navigate('/notifications', {
                    state: { prefillStation: { id: id!, name: station?.name ?? '' } }
                  })
                }
              >
                <Bell className={getIconStyle(flyingMode)} />
              </Button>
            )}
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

        {/* Copy link */}
        {station && isStandalone && (
          <Button
            variant="secondary"
            size="icon"
            className="fixed bottom-5 left-5 rounded-full shadow-md z-20"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success('Station URL copied to clipboard');
            }}
          >
            <Link2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  // Desktop: Dialog overlay
  return (
    <Dialog open onOpenChange={() => navigate('/')}>
      {station && (
        <SEO title={station.name} description={stationDescription} path={`/stations/${id}`} />
      )}
      <DialogContent
        className="sm:max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col gap-0 focus:outline-none"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="sticky pb-2">
          <DialogTitle className="text-center">{headerContent}</DialogTitle>
          <DialogDescription className="sr-only">
            Weather station current conditions.
          </DialogDescription>
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
