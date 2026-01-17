import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getLandingById } from "@/services/landing.service";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  PlaneLanding,
  AlertCircleIcon,
  ArrowLeft,
  ChevronRightIcon,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import type { ILanding } from "@/models/landing.model";
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
import { handleError } from "@/lib/utils";

export default function Site() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [landing, setLanding] = useState<ILanding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchLanding = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getLandingById(id);
        if (!data) {
          throw new Error("Landing not found");
        }
        setLanding(data);
      } catch (err) {
        setError(handleError(err, "Failed to load landing details"));
      } finally {
        setIsLoading(false);
      }
    };

    void fetchLanding();
  }, [id]);

  // Navigate back if landing not found
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
        {landing?.name}
      </span>

      <span className="font-thin text-[10px] sm:text-xs mb-1">
        [ {landing?.location.coordinates[1].toFixed(4)},
        {landing?.location.coordinates[0].toFixed(4)} ] {landing?.elevation}m
      </span>
    </div>
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
      ) : landing ? (
        <div className="space-y-2">
          {/* Notices */}
          {landing.mandatoryNotices && (
            <Alert variant="destructive" className="py-2">
              <AlertCircleIcon />
              <AlertDescription className="text-sm text-muted-foreground whitespace-pre-wrap">
                {landing.mandatoryNotices}
              </AlertDescription>
            </Alert>
          )}

          {/* Site Guide */}
          {landing.siteGuideUrl && (
            <Item variant="outline" size="sm" asChild className="py-2">
              <a href={landing.siteGuideUrl} target="_blank" rel="noreferrer">
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

          {/* Description */}
          {landing.description && (
            <div className="mb-4">
              <p className="text-sm whitespace-pre-wrap">
                {landing.description}
              </p>
            </div>
          )}

          {/* Disclaimer */}
          <div>
            <p className="text-[10px] text-muted-foreground whitespace-pre-wrap">
              Disclaimer: Zephyr does not guarantee the accuracy of this
              information. Pilots are responsible for verifying current
              conditions.
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
            <div className="flex w-full text-center justify-evenly items-center">
              {headerContent}
              <PlaneLanding />
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
          <DialogTitle className="flex w-full text-center justify-center items-center">
            <PlaneLanding className="mr-8" />
            {headerContent}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 p-1">{bodyContent}</div>
      </DialogContent>
    </Dialog>
  );
}
