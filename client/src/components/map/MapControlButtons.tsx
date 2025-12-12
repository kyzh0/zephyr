import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  HelpCircle,
  Grid3X3,
  TrendingUp,
  Layers,
  HandHelping,
  Video,
  LocateFixed,
  History,
} from "lucide-react";
import { DonateDialog } from "./DonateDialog";
import { HelpDialog, WELCOME_STORAGE_KEY } from "./HelpDialog";
import { GridViewDialog } from "./GridViewDialog";
import { HistorySlider } from "./HistorySlider";
import { ElevationSlider } from "./ElevationSlider";
import { SearchBar } from "./SearchBar";
import type { WindUnit } from "./map.types";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getRecentStations,
  RECENT_STATIONS_UPDATED_EVENT,
  type RecentStation,
} from "@/services/recentStations.service";

interface MapControlButtonsProps {
  onWebcamClick: () => void;
  onSoundingClick: () => void;
  onLayerToggle: () => void;
  onLocateClick: () => void;
  unit: WindUnit;
  onUnitToggle: () => void;
  historyOffset: number;
  onHistoryChange: (offset: number) => void;
  isHistoricData: boolean;
  showElevation: boolean;
  elevationFilter: number;
  onToggleElevation: () => void;
  onElevationChange: (value: number) => void;
  minimizeRecents: boolean;
  onRecentsToggle: () => void;
}

export function MapControlButtons({
  onWebcamClick,
  onSoundingClick,
  onLayerToggle,
  onLocateClick,
  unit,
  onUnitToggle,
  historyOffset,
  onHistoryChange,
  isHistoricData,
  showElevation,
  elevationFilter,
  onToggleElevation,
  onElevationChange,
  minimizeRecents,
  onRecentsToggle,
}: MapControlButtonsProps) {
  const navigate = useNavigate();
  const [donateOpen, setDonateOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(
    localStorage.getItem(WELCOME_STORAGE_KEY) !== "true"
  );
  const [gridOpen, setGridOpen] = useState(false);
  const [recentStations, setRecentStations] = useState<RecentStation[]>([]);

  // Load recent stations on mount and when localStorage changes
  useEffect(() => {
    const loadRecentStations = () => {
      setRecentStations(getRecentStations());
    };

    loadRecentStations();

    // Listen for storage changes (in case another tab updates)
    window.addEventListener("storage", loadRecentStations);

    // Listen for custom event when recent stations are updated
    window.addEventListener(RECENT_STATIONS_UPDATED_EVENT, loadRecentStations);

    // Also refresh when the component becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadRecentStations();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("storage", loadRecentStations);
      window.removeEventListener(
        RECENT_STATIONS_UPDATED_EVENT,
        loadRecentStations
      );
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <>
      {/* Top left - horizontal row */}
      <div className="flex flex-wrap gap-2 items-start absolute top-2.5 left-2.5 z-50 right-14">
        <SearchBar disabled={isHistoricData} />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHelpOpen(true)}
              disabled={isHistoricData}
              className="h-9 w-9"
            >
              <HelpCircle className="h-4 w-4 opacity-70" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>View Help</TooltipContent>
        </Tooltip>
        <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDonateOpen(true)}
              disabled={isHistoricData}
              className="h-9 w-9"
            >
              <HandHelping className="h-4 w-4 opacity-70" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Donate to support Zephyr</TooltipContent>
        </Tooltip>
        <DonateDialog open={donateOpen} onOpenChange={setDonateOpen} />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGridOpen(true)}
              disabled={isHistoricData}
              className="h-9 w-9"
            >
              <Grid3X3 className="h-4 w-4 opacity-70" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Grid View of Nearby Weather Stations</TooltipContent>
        </Tooltip>
        <GridViewDialog open={gridOpen} onOpenChange={setGridOpen} />
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              variant="outline"
              size="sm"
              onClick={onWebcamClick}
              disabled={isHistoricData}
              className="h-9 w-9 bg-background data-[state=on]:*:[svg]:fill-blue-500 data-[state=on]:*:[svg]:stroke-blue-500"
            >
              <Video className="h-4 w-4 opacity-70" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Show Webcams on Map</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              variant="outline"
              size="sm"
              onClick={onSoundingClick}
              disabled={isHistoricData}
              className="h-9 w-9 bg-background data-[state=on]:*:[svg]:fill-blue-500 data-[state=on]:*:[svg]:stroke-blue-500"
            >
              <TrendingUp className="h-4 w-4 opacity-70" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Show Soundings on Map</TooltipContent>
        </Tooltip>
        <HistorySlider
          historyOffset={historyOffset}
          onHistoryChange={onHistoryChange}
        />
      </div>

      {/* Top right - vertical column */}
      <div className="flex flex-col gap-2 items-end absolute top-2.5 right-2.5 z-50">
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              variant="outline"
              size="sm"
              onClick={onUnitToggle}
              className="h-9 w-9 text-xs font-semibold bg-background"
            >
              {unit === "kt" ? "kt" : "km/h"}
            </Toggle>
          </TooltipTrigger>
          <TooltipContent side="left">Toggle Units</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              variant="outline"
              size="sm"
              onClick={onLayerToggle}
              className="h-9 w-9 text-xs font-semibold bg-background"
            >
              <Layers className="h-4 w-4 opacity-70" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent side="left">Switch Map Layer</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onLocateClick}
              className="h-9 w-9"
            >
              <LocateFixed className="h-4 w-4 opacity-70" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Find My Location</TooltipContent>
        </Tooltip>
        <ElevationSlider
          showElevation={showElevation}
          elevationFilter={elevationFilter}
          onToggleElevation={onToggleElevation}
          onElevationChange={onElevationChange}
        />
      </div>

      {/* Bottom left - Recent Stations (hidden in history mode) */}
      {recentStations.length > 0 && !isHistoricData && (
        <div className="absolute bottom-2.5 left-2.5 z-50">
          {minimizeRecents ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRecentsToggle}
                  className="h-9 w-9"
                >
                  <History className="h-4 w-4 opacity-70" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Show Recent Stations</TooltipContent>
            </Tooltip>
          ) : (
            <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-2 max-w-[200px]">
              <div
                className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5 px-1 cursor-pointer hover:text-foreground transition-colors"
                onClick={onRecentsToggle}
                title="Click to minimize"
              >
                <History className="h-3 w-3" />
                <span>Recent Stations</span>
              </div>
              <div className="flex flex-col gap-1">
                {recentStations.map((station) => {
                  const displayName =
                    station.name.length > 14
                      ? `${station.name.slice(0, 7)}...${station.name.slice(
                          -5
                        )}`
                      : station.name;
                  return (
                    <Button
                      key={station.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/stations/${station.id}`)}
                      className="h-7 justify-start text-xs font-normal px-2 truncate"
                      title={station.name}
                    >
                      {displayName}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
