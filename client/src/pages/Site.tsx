import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSiteById } from "@/services/site.service";
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
  ArrowLeft,
  ChevronRightIcon,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import type { ISite } from "@/models/site.model";
import { useIsMobile } from "@/hooks";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

export default function Site() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [site, setSite] = useState<ISite | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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
        setError(
          err instanceof Error ? err : new Error("Failed to fetch site")
        );
      } finally {
        setIsLoading(false);
      }
    };

    void fetchSite();
  }, [id]);

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
    <span className="text-lg sm:text-xl font-semibold leading-tight">
      {site?.name}
    </span>
  );

  // Shared body content
  const bodyContent = (
    <>
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : site ? (
        <div className="space-y-4">
          {/* Notices */}
          {site.mandatoryNotices && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Mandatory Notices</AlertTitle>
              <AlertDescription className="text-sm text-muted-foreground whitespace-pre-wrap">
                {site.mandatoryNotices}
              </AlertDescription>
            </Alert>
          )}

          {/* External Link */}
          {site.siteGuideUrl && (
            <Item variant="outline" size="sm" asChild>
              <a href={site.siteGuideUrl} target="_blank" rel="noreferrer">
                <ItemMedia>
                  <ExternalLink className="h-4 w-4" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>View the official site guide.</ItemTitle>
                </ItemContent>
                <ItemActions>
                  <ChevronRightIcon className="size-4" />
                </ItemActions>
              </a>
            </Item>
          )}

          <h2 className="text-lg sm:text-xl font-semibold leading-tight mt-4 sm:mt-6">
            Site Details
          </h2>

          {/* Description */}
          {site.description && (
            <div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {site.description}
              </p>
            </div>
          )}

          {/* Site Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <h3 className="font-semibold text-sm mb-1">
                Takeoff Coordinates
              </h3>
              <p className="text-sm text-muted-foreground">
                {site.takeoffLocation.coordinates[0].toFixed(5)},{" "}
                {site.takeoffLocation.coordinates[1].toFixed(5)}
              </p>
            </div>
            {site.landingLocation && (
              <div>
                <h3 className="font-semibold text-sm mb-1">
                  Landing Coordinates
                </h3>
                <p className="text-sm text-muted-foreground">
                  {site.landingLocation.coordinates[0].toFixed(5)},{" "}
                  {site.landingLocation.coordinates[1].toFixed(5)}
                </p>
              </div>
            )}
            {site.elevation && (
              <div>
                <h3 className="font-semibold text-sm mb-1">Elevation</h3>
                <p className="text-sm text-muted-foreground">
                  {site.elevation}m
                </p>
              </div>
            )}

            {site.validBearings && (
              <div>
                <h3 className="font-semibold text-sm mb-1">Valid Bearings</h3>
                <p className="text-sm text-muted-foreground">
                  {site.validBearings}
                </p>
              </div>
            )}

            {site.radio && (
              <div>
                <h3 className="font-semibold text-sm mb-1">Radio</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {site.radio}
                </p>
              </div>
            )}

            {(site.rating.paragliding || site.rating.hangGliding) && (
              <div>
                <h3 className="font-semibold text-sm mb-1">Rating Required</h3>
                <div className="text-sm text-muted-foreground">
                  {site.rating.paragliding && (
                    <div>
                      PG:{" "}
                      {site.rating.paragliding === "UNKNOWN"
                        ? "Unknown"
                        : site.rating.paragliding}
                    </div>
                  )}
                  {site.rating.hangGliding && (
                    <div>
                      HG:{" "}
                      {site.rating.hangGliding === "UNKNOWN"
                        ? "Unknown"
                        : site.rating.hangGliding}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <h2 className="text-lg sm:text-xl font-semibold leading-tight mt-4 sm:mt-6">
            Notices
          </h2>

          {site.airspaceNotices && (
            <div>
              <h3 className="font-semibold text-sm mb-1">Airspace Notices</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {site.airspaceNotices}
              </p>
            </div>
          )}

          {site.landingNotices && (
            <div>
              <h3 className="font-semibold text-sm mb-1">Landing Notices</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {site.landingNotices}
              </p>
            </div>
          )}

          {/* External Link */}
          {site.siteGuideUrl && (
            <Item variant="outline" size="sm" asChild>
              <a href={site.siteGuideUrl} target="_blank" rel="noreferrer">
                <ItemMedia>
                  <ExternalLink className="h-4 w-4" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>View the official site guide.</ItemTitle>
                  <ItemDescription>
                    Zephyr is not an official site guide, and the information
                    here may be outdated.
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <ChevronRightIcon className="size-4" />
                </ItemActions>
              </a>
            </Item>
          )}
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
            <div className="flex-1 text-center pr-10">{headerContent}</div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          {bodyContent}
        </div>
      </div>
    );
  }

  // Desktop: Dialog overlay
  return (
    <Dialog open onOpenChange={() => navigate(-1)}>
      <DialogContent className="sm:max-w-3xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col gap-0">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-center">{headerContent}</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 p-1">{bodyContent}</div>
      </DialogContent>
    </Dialog>
  );
}
