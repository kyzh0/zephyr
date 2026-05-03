import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertCircleIcon,
  TriangleAlertIcon,
  PlaneLanding,
  ArrowLeft,
  ChevronRightIcon,
  ChevronDown,
  ExternalLink,
  Link2
} from 'lucide-react';

import SEO from '@/components/SEO';
import { WebcamPreview } from '@/components/webcam/WebcamPreview';
import { WindCompass } from '@/components/station';
import { StationPreview } from '@/components/station/StationPreview';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle
} from '@/components/ui/item';

import { getButtonStyle, getIconStyle } from '@/lib/utils';
import { ApiError } from '@/services/api-error';
import { useAppStore } from '@/store';
import { useIsMobile, useNearbyWebcams, useNearbyStations, useSite } from '@/hooks';

const isStandalone =
  typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;

export default function Site() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const flyingMode = useAppStore((s) => s.flyingMode);
  const [webcamsOpen, setWebcamsOpen] = useState(false);
  const [stationsOpen, setStationsOpen] = useState(false);

  const { site, isLoading, error } = useSite(id);

  const { data: nearbyWebcamData } = useNearbyWebcams({
    lon: site?.location.coordinates[0] ?? 0,
    lat: site?.location.coordinates[1] ?? 0
  });

  const { data: nearbyStationData } = useNearbyStations({
    lon: site?.location.coordinates[0] ?? 0,
    lat: site?.location.coordinates[1] ?? 0
  });

  // Navigate back if site not found
  useEffect(() => {
    if (error instanceof ApiError && error.status === 404) navigate('/', { replace: true });
  }, [error, navigate]);

  // Shared header content
  const headerContent = isLoading ? (
    <Skeleton className="h-7 w-48 mx-auto" />
  ) : (
    <div className="grid grid-cols-1">
      <span className="text-lg sm:text-xl font-semibold leading-tight">{site?.name}</span>

      {site && (
        <div className="flex items-center gap-1 font-thin text-[10px] sm:text-xs">
          <a
            className="text-blue-600"
            href={`https://www.google.com/maps/place/${site?.location.coordinates[1]},${site?.location.coordinates[0]}`}
            target="_blank"
          >
            Open in Google Maps
          </a>
          <span>{site.elevation}m</span>
        </div>
      )}
    </div>
  );

  // Shared body content
  const bodyContent = (
    <>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : site ? (
        <div className="space-y-2">
          {/* Notices */}
          {site.mandatoryNotices && (
            <Alert variant="destructive" className="py-2">
              <AlertCircleIcon />
              <AlertDescription className="text-sm text-muted-foreground whitespace-pre-wrap">
                {site.mandatoryNotices}
              </AlertDescription>
            </Alert>
          )}

          {/* Site Guide */}
          {site.siteGuideUrl && (
            <Item variant="outline" size="sm" asChild className="py-2">
              <a href={site.siteGuideUrl} target="_blank" rel="noreferrer">
                <ItemMedia>
                  <ExternalLink className="h-4 w-4" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>View the official site guide.</ItemTitle>
                  <ItemDescription>For current information</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <ChevronRightIcon className="size-4" />
                </ItemActions>
              </a>
            </Item>
          )}

          {/* Hazards */}
          {site.hazards && (
            <Alert className="py-2 text-orange-600">
              <TriangleAlertIcon />
              <AlertDescription className="text-sm text-orange-600 whitespace-pre-wrap">
                {site.hazards}
              </AlertDescription>
            </Alert>
          )}

          {/* Landing */}
          {site.landings?.map((l) => (
            <Item key={l.landingId} variant="outline" size="sm" asChild className="py-2">
              <a className="cursor-pointer" onClick={() => navigate(`/landings/${l.landingId}`)}>
                <ItemMedia>
                  <PlaneLanding className="h-4 w-4" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{l.landingName}</ItemTitle>
                </ItemContent>
                <ItemActions>
                  <ChevronRightIcon className="size-4" />
                </ItemActions>
              </a>
            </Item>
          ))}

          {/* Description */}
          {site.description && (
            <div className="my-4">
              <p className="text-sm whitespace-pre-wrap">{site.description}</p>
            </div>
          )}

          {/* Access */}
          {site.access && (
            <div className="mb-4">
              <h3 className="font-semibold text-sm mb-1">Access</h3>
              <p className="text-sm whitespace-pre-wrap">{site.access}</p>
            </div>
          )}

          {/* Nearby Stations */}
          {site && nearbyStationData.length > 0 && (
            <Collapsible open={stationsOpen} onOpenChange={setStationsOpen}>
              <CollapsibleTrigger
                className={`flex items-center justify-between w-full py-2 text-sm font-medium hover:underline rounded px-3 ${
                  stationsOpen ? 'bg-transparent' : 'bg-muted'
                }`}
              >
                <span>Nearby Weather Stations ({nearbyStationData.length} within 10km)</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${stationsOpen ? 'rotate-180' : ''}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2 flex flex-row flex-wrap gap-4">
                {nearbyStationData.map((station) => (
                  <StationPreview
                    key={String(station.data._id)}
                    data={station.data}
                    distance={station.distance}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Nearby Webcams */}
          {site && nearbyWebcamData.length > 0 && (
            <Collapsible open={webcamsOpen} onOpenChange={setWebcamsOpen}>
              <CollapsibleTrigger
                className={`flex items-center justify-between w-full py-2 text-sm font-medium hover:underline rounded px-3 ${
                  webcamsOpen ? 'bg-transparent' : 'bg-muted'
                }`}
              >
                <span>Nearby Webcams ({nearbyWebcamData.length} within 10km)</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${webcamsOpen ? 'rotate-180' : ''}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2 flex flex-row flex-wrap gap-4">
                {nearbyWebcamData.map((webcam) => (
                  <WebcamPreview
                    key={webcam.data._id}
                    _id={webcam.data._id}
                    name={webcam.data.name}
                    distance={webcam.distance}
                    currentUrl={webcam.data.currentUrl}
                    onClick={() => navigate(`/webcams/${webcam.data._id}`)}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Disclaimer */}
          <div>
            <p className="text-[10px] text-muted-foreground whitespace-pre-wrap">
              Zephyr does not guarantee the accuracy of this information. Pilots are responsible for
              verifying current conditions.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );

  const siteDescription = site
    ? `${site.name} — flying site in New Zealand.${site.description ? ` ${site.description.slice(0, 120)}` : ''}`
    : 'Flying site in New Zealand';

  // Mobile: Full-screen layout
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col z-100">
        {site && <SEO title={site.name} description={siteDescription} path={`/sites/${id}`} />}
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
            <div className="flex w-full text-center justify-evenly items-center mb-3">
              {headerContent}
              {site?.validBearings && (
                <WindCompass
                  bearing={undefined}
                  validBearings={site.validBearings}
                  containerSize={{ width: 24, height: 24 }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 pt-1 flex flex-col gap-4">{bodyContent}</div>

        {/* Copy link */}
        {site && isStandalone && (
          <Button
            variant="secondary"
            size="icon"
            className="fixed bottom-5 left-5 rounded-full shadow-md z-20"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success('Site URL copied to clipboard');
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
      {site && <SEO title={site.name} description={siteDescription} path={`/sites/${id}`} />}
      <DialogContent
        className="sm:max-w-3xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col gap-0 focus:outline-none"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="pb-2">
          <DialogTitle className="text-center mb-3">
            <div className="flex w-full justify-center items-center">
              {site?.validBearings && (
                <div className="mr-8">
                  <WindCompass
                    bearing={undefined}
                    validBearings={site.validBearings}
                    containerSize={{ width: 24, height: 24 }}
                  />
                </div>
              )}
              {headerContent}
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">Flying site details.</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 p-1">{bodyContent}</div>
      </DialogContent>
    </Dialog>
  );
}
