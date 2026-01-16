import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  HelpCircle,
  Grid3X3,
  Layers,
  HandHelping,
  Camera,
  LocateFixed,
  History,
  Mail,
} from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { HelpDialog, WELCOME_STORAGE_KEY } from "./HelpDialog";
import { DonateDialog } from "./DonateDialog";
import { ContactDialog } from "./ContactDialog";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getRecentStations,
  RECENT_STATIONS_UPDATED_EVENT,
  type RecentStation,
} from "@/services/recentStations.service";
import { useIsMobile } from "@/hooks/useIsMobile";

interface MapControlButtonsProps {
  onWebcamClick: () => void;
  showWebcams: boolean;
  onSoundingClick: () => void;
  showSoundings: boolean;
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
  viewMode: "sites" | "stations";
  onToggleViewMode: (value: "sites" | "stations") => void;
}

export function MapControlButtons({
  onWebcamClick,
  showWebcams,
  onSoundingClick,
  showSoundings,
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
  viewMode,
  onToggleViewMode,
}: MapControlButtonsProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [helpOpen, setHelpOpen] = useState(
    window.self === window.top && // don't show if iframe
      localStorage.getItem(WELCOME_STORAGE_KEY) !== "true"
  );
  const [donateOpen, setDonateOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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

  // Render menu button content
  const renderMenuContent = () => (
    <div className="flex flex-col gap-0">
      <div className="px-2 py-1.5">
        <Tabs
          value={viewMode}
          onValueChange={(value) => {
            onToggleViewMode(value as "stations" | "sites");
            setMenuOpen(false);
          }}
          className="h-9"
        >
          <TabsList className="h-9 w-full">
            <TabsTrigger value="stations" className="h-8 flex-1">
              Stations
            </TabsTrigger>
            <TabsTrigger value="sites" className="h-8 flex-1">
              Sites
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="border-t my-1" />
      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-2"
        onClick={() => {
          navigate("/grid");
          setMenuOpen(false);
        }}
        disabled={isHistoricData}
      >
        <Grid3X3 className="h-4 w-4 opacity-70" />
        Grid View
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-2"
        onClick={() => {
          onWebcamClick();
          setMenuOpen(false);
        }}
        disabled={isHistoricData}
      >
        <Camera className="h-4 w-4 opacity-70" />
        {showWebcams ? "Hide" : "Show"} Webcams
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-2"
        onClick={() => {
          onSoundingClick();
          setMenuOpen(false);
        }}
        disabled={isHistoricData}
      >
        <svg viewBox="0 0 18 18" className="h-4 w-4 opacity-70">
          <g transform="rotate(-90, 9, 9)">
            <path d="m18,2.47l-9,6.53l-4.38,-4.38l-4.62,3.38l0,-2.48l4.83,-3.52l4.38,4.38l8.79,-6.38m0,12l-4.7,0l-4.17,3.34l-6.13,-5.93l-3,2.13l0,2.46l2.8,-2l6.2,6l5,-4l4,0l0,-2z" />
          </g>
        </svg>
        {showSoundings ? "Hide" : "Show"} Soundings
      </Button>
      <div className="border-t my-1" />
      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-2"
        onClick={() => {
          setHelpOpen(true);
          setMenuOpen(false);
        }}
      >
        <HelpCircle className="h-4 w-4 opacity-70" />
        Help
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-2"
        onClick={() => {
          setDonateOpen(true);
          setMenuOpen(false);
        }}
      >
        <HandHelping className="h-4 w-4 opacity-70" />
        Donate
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-2"
        onClick={() => {
          setContactOpen(true);
          setMenuOpen(false);
        }}
      >
        <Mail className="h-4 w-4 opacity-70" />
        Contact
      </Button>
    </div>
  );

  return (
    <>
      {/* Top left controls */}
      <div className="flex flex-wrap gap-2 items-start absolute top-2.5 left-2.5 z-50 right-2.5 md:right-auto">
        {isMobile ? (
          <>
            {/* Mobile: Hamburger menu + Search + Historic Data */}
            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 w-9">
                  <Menu className="h-4 w-4 opacity-70" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={4}
                className="p-1 w-auto"
              >
                {renderMenuContent()}
              </PopoverContent>
            </Popover>
            <SearchBar disabled={isHistoricData} />
            <HistorySlider
              historyOffset={historyOffset}
              onHistoryChange={onHistoryChange}
            />
          </>
        ) : (
          <>
            {/* Large screens: Top-left group */}
            <SearchBar disabled={isHistoricData} />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9"
                  onClick={() => setHelpOpen(true)}
                >
                  <HelpCircle className="h-4 w-4 opacity-70" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Help</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9"
                  onClick={() => setDonateOpen(true)}
                >
                  <HandHelping className="h-4 w-4 opacity-70" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Donate</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9"
                  onClick={() => setContactOpen(true)}
                >
                  <Mail className="h-4 w-4 opacity-70" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Contact</TooltipContent>
            </Tooltip>
            <HistorySlider
              historyOffset={historyOffset}
              onHistoryChange={onHistoryChange}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/grid")}
                  disabled={isHistoricData}
                  className="h-9 w-9"
                >
                  <Grid3X3 className="h-4 w-4 opacity-70" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Grid View of Nearby Weather Stations
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  variant="outline"
                  size="sm"
                  onClick={onWebcamClick}
                  disabled={isHistoricData}
                  className={`h-9 w-9 bg-background ${
                    showWebcams ? "*:[svg]:stroke-blue-500" : ""
                  }`}
                >
                  <Camera className="h-4 w-4 opacity-70" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>
                {showWebcams ? "Hide" : "Show"} Webcams on Map
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  variant="outline"
                  size="sm"
                  onClick={onSoundingClick}
                  disabled={isHistoricData}
                  className={`h-9 w-9 bg-background ${
                    showSoundings ? "fill-blue-500" : ""
                  }`}
                >
                  <svg viewBox="0 0 18 18" className="h-4 w-4 opacity-70">
                    <g transform="rotate(-90, 9, 9)">
                      <path d="m18,2.47l-9,6.53l-4.38,-4.38l-4.62,3.38l0,-2.48l4.83,-3.52l4.38,4.38l8.79,-6.38m0,12l-4.7,0l-4.17,3.34l-6.13,-5.93l-3,2.13l0,2.46l2.8,-2l6.2,6l5,-4l4,0l0,-2z" />
                    </g>
                  </svg>
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>
                {showSoundings ? "Hide" : "Show"} Soundings on Map
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Tabs
                  value={viewMode}
                  onValueChange={(value) =>
                    onToggleViewMode(value as "stations" | "sites")
                  }
                  className="h-9"
                >
                  <TabsList className="h-9">
                    <TabsTrigger value="stations" className="h-8">
                      Stations
                    </TabsTrigger>
                    <TabsTrigger value="sites" className="h-8">
                      Sites
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </TooltipTrigger>
              <TooltipContent>
                Switch between viewing weather stations or flying sites
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>

      {/* Top right controls */}
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
          <TooltipContent side="left">
            Change unit to {unit === "kt" ? "km/h" : "kt"}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              variant="outline"
              size="sm"
              onClick={onLayerToggle}
              className="h-9 w-9 bg-background"
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

      {/* Dialogs */}
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <DonateDialog open={donateOpen} onOpenChange={setDonateOpen} />
      <ContactDialog open={contactOpen} onOpenChange={setContactOpen} />

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

export default MapControlButtons;
