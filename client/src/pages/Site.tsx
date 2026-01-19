import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSiteById } from "@/services/site.service";
import { StationPreview } from "@/components/station/StationPreview";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AlertCircleIcon,
  TriangleAlertIcon,
  PlaneLanding,
  ArrowLeft,
  ChevronRightIcon,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import type { ISite } from "@/models/site.model";
import { useIsMobile } from "@/hooks";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import {
  useNearbyWebcams,
  type UseNearbyWebcamsResult,
} from "@/hooks/useWebcam";
import {
  useNearbyStations,
  type UseNearbyStationsResult,
} from "@/hooks/useStations";
import { handleError } from "@/lib/utils";
import { WebcamPreview } from "@/components/webcam/WebcamPreview";
import { WindCompass } from "@/components/station";

export default function Site() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [site, setSite] = useState<ISite | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [webcamsOpen, setWebcamsOpen] = useState(false);
  const [stationsOpen, setStationsOpen] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchSite = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getSiteById(id);
        if (!data) {
          throw new Error("Site not found");
        }
        setSite(data);
      } catch (err) {
        setError(handleError(err, "Failed to load site details"));
      } finally {
        setIsLoading(false);
      }
    };

    void fetchSite();
  }, [id]);

  const { webcams }: UseNearbyWebcamsResult = useNearbyWebcams({
    latitude: site?.location.coordinates[0] ?? 0,
    longitude: site?.location.coordinates[1] ?? 0,
  });

  const { stations }: UseNearbyStationsResult = useNearbyStations({
    lat: site?.location.coordinates[0] ?? 0,
    lon: site?.location.coordinates[1] ?? 0,
  });

  // Navigate back if site not found
  useEffect(() => {
    if (error) {
      navigate(-1);
    }
  }, [error, navigate]);

  // Shared header content
  const headerContent = isLoading ? (
    <Skeleton className="h-7 w-48 mx-auto" />
  ) : (
    <div className="grid grid-cols-1">
      <span className="text-lg sm:text-xl font-semibold leading-tight">
        {site?.name}
      </span>

      <span className="font-thin text-[10px] sm:text-xs">
        [ {site?.location.coordinates[1].toFixed(4)},
        {site?.location.coordinates[0].toFixed(4)} ] {site?.elevation}m
      </span>
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
            <Item
              key={l.landingId}
              variant="outline"
              size="sm"
              asChild
              className="py-2"
            >
              <a
                className="cursor-pointer"
                onClick={() => navigate(`/landings/${l.landingId}`)}
              >
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
          {site && stations.length > 0 && (
            <Collapsible open={stationsOpen} onOpenChange={setStationsOpen}>
              <CollapsibleTrigger
                className={`flex items-center justify-between w-full py-2 text-sm font-medium hover:underline rounded px-3 ${
                  stationsOpen ? "bg-transparent" : "bg-muted mb-4"
                }`}
              >
                <span>
                  Nearby Weather Stations ({stations.length} within 10km)
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    stationsOpen ? "rotate-180" : ""
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2 flex flex-row flex-wrap gap-4">
                {stations.map((station) => (
                  <StationPreview key={String(station._id)} station={station} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Nearby Webcams */}
          {site && webcams.length > 0 && (
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
                  <WebcamPreview
                    key={webcam._id}
                    _id={webcam._id}
                    name={webcam.name}
                    distance={webcam.distance}
                    currentUrl={webcam.currentUrl}
                    onClick={() => navigate(`/webcams/${webcam._id}`)}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Disclaimer */}
          <div>
            <p className="text-[10px] text-muted-foreground whitespace-pre-wrap">
              Zephyr does not guarantee the accuracy of this information. Pilots
              are responsible for verifying current conditions.
            </p>
          </div>
        </div>
      ) : null}
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
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
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
        <div className="flex-1 overflow-y-auto px-4 pt-1 flex flex-col gap-4">
          {bodyContent}
        </div>
      </div>
    );
  }

  // Desktop: Dialog overlay
  return (
    <Dialog open onOpenChange={() => navigate("/")}>
      <DialogContent className="sm:max-w-3xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col gap-0">
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
        </DialogHeader>

        <div className="overflow-y-auto flex-1 p-1">{bodyContent}</div>
      </DialogContent>
    </Dialog>
  );
}
