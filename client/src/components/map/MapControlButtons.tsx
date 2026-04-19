import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Hourglass,
  Undo2
} from 'lucide-react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { HistorySlider } from './HistorySlider';
import { FilterDialog } from './FilterDialog';
import { SearchBar } from './SearchBar';
import {
  MAP_OVERLAYS,
  MAP_VIEW_MODES,
  WIND_UNITS,
  SPORT_LABELS,
  type MapControlHandlers,
  type MapViewMode,
  type SportType
} from './map.types';

import { getButtonStyle, getIconStyle } from '@/lib/utils';
import { useIsMobile } from '@/hooks';
import { useAppStore, useMapStore } from '@/store';

const VALID_VIEW_MODES = new Set<string>(Object.values(MAP_VIEW_MODES));
function isMapViewMode(value: string): value is MapViewMode {
  return VALID_VIEW_MODES.has(value);
}

export function MapControlButtons({
  onLayerToggle,
  onLocateClick,
  onHistoryChange,
  onSiteDirectionFilterChange,
  onSearchSelect
}: MapControlHandlers) {
  const {
    overlay,
    unit,
    viewMode,
    historyOffset,
    stationElevationFilter,
    selectedSiteDirection,
    minimizeRecents,
    toggleWebcams,
    toggleSoundings,
    setUnit,
    setViewMode,
    toggleMinimizeRecents,
    setStationElevationFilter
  } = useMapStore(
    useShallow((s) => ({
      overlay: s.overlay,
      unit: s.unit,
      viewMode: s.viewMode,
      historyOffset: s.historyOffset,
      stationElevationFilter: s.stationElevationFilter,
      selectedSiteDirection: s.selectedSiteDirection,
      minimizeRecents: s.minimizeRecents,
      toggleWebcams: s.toggleWebcams,
      toggleSoundings: s.toggleSoundings,
      setUnit: s.setUnit,
      setViewMode: s.setViewMode,
      toggleMinimizeRecents: s.toggleMinimizeRecents,
      setStationElevationFilter: s.setStationElevationFilter
    }))
  );
  const { flyingMode, toggleFlyingMode, sport, setSport, welcomeDismissed, recentStations } =
    useAppStore(
      useShallow((s) => ({
        flyingMode: s.flyingMode,
        toggleFlyingMode: s.toggleFlyingMode,
        sport: s.sport,
        setSport: s.setSport,
        welcomeDismissed: s.welcomeDismissed,
        recentStations: s.recentStations
      }))
    );

  const showWebcams = overlay === MAP_OVERLAYS.WEBCAMS;
  const showSoundings = overlay === MAP_OVERLAYS.SOUNDINGS;
  const isHistoricData = historyOffset < 0;
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isFlyingMode = flyingMode && isMobile;
  // flyingMode forces recents minimised; user toggle takes effect otherwise
  const effectiveMinimizeRecents = flyingMode ? true : minimizeRecents;

  const [isLocating, setIsLocating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLocating) return;

    const run = async () => {
      try {
        await onLocateClick();
      } catch {
        toast.error('Geolocation error');
      } finally {
        setIsLocating(false);
      }
    };

    run();
  }, [isLocating, onLocateClick]);

  useEffect(() => {
    if (!welcomeDismissed) {
      navigate('/help');
    }
  }, [navigate, welcomeDismissed]);

  const renderMenuContent = () => (
    <div className="flex flex-col gap-0">
      <div className="px-2 py-1.5">
        <Tabs
          value={viewMode}
          onValueChange={(value) => {
            if (isMapViewMode(value)) setViewMode(value);
            setMenuOpen(false);
          }}
          className="h-9"
        >
          <TabsList className="h-9 w-full">
            <TabsTrigger
              disabled={isHistoricData}
              value={MAP_VIEW_MODES.STATIONS}
              className="h-8 flex-1"
            >
              Stations
            </TabsTrigger>
            <TabsTrigger
              disabled={isHistoricData}
              value={MAP_VIEW_MODES.SITES}
              className="h-8 flex-1"
            >
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
          onHistoryChange(-30);
          setMenuOpen(false);
        }}
        disabled={isHistoricData || viewMode === MAP_VIEW_MODES.SITES}
      >
        <Hourglass className={`${getIconStyle(isFlyingMode)} opacity-70`} />
        History View
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-2"
        onClick={() => {
          navigate('/grid');
          setMenuOpen(false);
        }}
        disabled={isHistoricData}
      >
        <Grid3X3 className={`${getIconStyle(isFlyingMode)} opacity-70`} />
        Grid View
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-2"
        onClick={() => {
          toggleSoundings();
          setMenuOpen(false);
        }}
        disabled={isHistoricData}
      >
        <svg viewBox="0 0 18 18" className={`${getIconStyle(isFlyingMode)} opacity-70`}>
          <g transform="rotate(-90, 9, 9)">
            <path d="m18,2.47l-9,6.53l-4.38,-4.38l-4.62,3.38l0,-2.48l4.83,-3.52l4.38,4.38l8.79,-6.38m0,12l-4.7,0l-4.17,3.34l-6.13,-5.93l-3,2.13l0,2.46l2.8,-2l6.2,6l5,-4l4,0l0,-2z" />
          </g>
        </svg>
        {showSoundings ? 'Hide' : 'Show'} Soundings
      </Button>
      <div className="border-t my-1" />
      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-2"
        onClick={() => {
          setMenuOpen(false);
          navigate('/help');
        }}
      >
        <HelpCircle className={`${getIconStyle(isFlyingMode)} opacity-70`} />
        Help
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-2"
        onClick={() => {
          setMenuOpen(false);
          navigate('/donate');
        }}
      >
        <HandHelping className={`${getIconStyle(isFlyingMode)} opacity-70`} />
        Donate
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-2"
        onClick={() => {
          setMenuOpen(false);
          navigate('/contact');
        }}
      >
        <Mail className={`${getIconStyle(isFlyingMode)} opacity-70`} />
        Contact
      </Button>
      <div className="border-t my-1" />
      <div className="px-2 py-1.5">
        <Tabs
          value={isFlyingMode ? 'on' : 'off'}
          onValueChange={(value) => {
            if ((value === 'on') !== isFlyingMode) {
              setViewMode(MAP_VIEW_MODES.STATIONS);
              toggleFlyingMode();
            }
            setMenuOpen(false);
          }}
          className="h-9"
        >
          <TabsList className="h-9 w-full">
            <TabsTrigger value="off" className="h-8 flex-1">
              Off
            </TabsTrigger>
            <TabsTrigger value="on" className="h-8 flex-1">
              Flying Mode
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="border-t my-1" />
      <div className="px-2 py-1.5">
        <Select
          value={sport as string}
          onValueChange={(v) => {
            setSport(v as SportType);
            setMenuOpen(false);
          }}
        >
          <SelectTrigger className="h-9 w-full text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(SPORT_LABELS) as [SportType, string][]).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <>
      {/* Top left controls */}
      <div
        className={`flex flex-wrap gap-2 items-start absolute top-2.5 left-2.5 z-50 right-2.5 md:right-auto`}
      >
        {isMobile ? (
          <>
            {/* Mobile: Hamburger menu + Search + Webcams */}
            {!isFlyingMode && (
              <Popover open={menuOpen} onOpenChange={setMenuOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={getButtonStyle(isFlyingMode)}>
                    <Menu className={`${getIconStyle(isFlyingMode)} opacity-70`} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" sideOffset={4} className="p-1 w-auto">
                  {renderMenuContent()}
                </PopoverContent>
              </Popover>
            )}
            {isFlyingMode && (
              <Toggle
                variant="outline"
                size="sm"
                onClick={toggleFlyingMode}
                className={`${getButtonStyle(isFlyingMode)} bg-background`}
              >
                <Undo2 className={`${getIconStyle(isFlyingMode)} opacity-70`} />
              </Toggle>
            )}
            {!isFlyingMode && <SearchBar disabled={isHistoricData} onSelect={onSearchSelect} />}
            <Toggle
              variant="outline"
              size="sm"
              onClick={toggleWebcams}
              disabled={isHistoricData}
              className={`${getButtonStyle(isFlyingMode)} bg-background ${showWebcams ? '*:[svg]:stroke-blue-500' : ''}`}
            >
              <Camera className={`${getIconStyle(isFlyingMode)} opacity-70`} />
            </Toggle>
            {isFlyingMode && (
              <Toggle
                variant="outline"
                size="sm"
                onClick={() => navigate('/grid')}
                className={`${getButtonStyle(isFlyingMode)} bg-background`}
              >
                <Grid3X3 className={`${getIconStyle(isFlyingMode)} opacity-70`} />
              </Toggle>
            )}
          </>
        ) : (
          <>
            {/* Large screens: Top-left group */}
            <SearchBar disabled={isHistoricData} onSelect={onSearchSelect} />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={getButtonStyle(isFlyingMode)}
                  onClick={() => navigate('/help')}
                >
                  <HelpCircle className={`${getIconStyle(isFlyingMode)} opacity-70`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Help</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={getButtonStyle(isFlyingMode)}
                  onClick={() => navigate('/donate')}
                >
                  <HandHelping className={`${getIconStyle(isFlyingMode)} opacity-70`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Donate</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={getButtonStyle(isFlyingMode)}
                  onClick={() => navigate('/contact')}
                >
                  <Mail className={`${getIconStyle(isFlyingMode)} opacity-70`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Contact</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  variant="outline"
                  size="sm"
                  onClick={() => onHistoryChange(isHistoricData ? 0 : -30)}
                  disabled={viewMode === MAP_VIEW_MODES.SITES}
                  className={`${getButtonStyle(isFlyingMode)} bg-background ${
                    historyOffset < 0 ? '*:[svg]:stroke-blue-500' : ''
                  }`}
                >
                  <Hourglass className={`${getIconStyle(isFlyingMode)} opacity-70`} />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>{historyOffset < 0 ? 'Hide' : 'Show'} History</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/grid')}
                  disabled={isHistoricData}
                  className={getButtonStyle(isFlyingMode)}
                >
                  <Grid3X3 className={`${getIconStyle(isFlyingMode)} opacity-70`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Grid View of Nearby Weather Stations</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  variant="outline"
                  size="sm"
                  onClick={toggleWebcams}
                  disabled={isHistoricData}
                  className={`${getButtonStyle(isFlyingMode)} bg-background ${
                    showWebcams ? '*:[svg]:stroke-blue-500' : ''
                  }`}
                >
                  <Camera className={`${getIconStyle(isFlyingMode)} opacity-70`} />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>{showWebcams ? 'Hide' : 'Show'} Webcams on Map</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  variant="outline"
                  size="sm"
                  onClick={toggleSoundings}
                  disabled={isHistoricData}
                  className={`${getButtonStyle(isFlyingMode)} bg-background ${showSoundings ? 'fill-blue-500' : ''}`}
                >
                  <svg viewBox="0 0 18 18" className={`${getIconStyle(isFlyingMode)} opacity-70`}>
                    <g transform="rotate(-90, 9, 9)">
                      <path d="m18,2.47l-9,6.53l-4.38,-4.38l-4.62,3.38l0,-2.48l4.83,-3.52l4.38,4.38l8.79,-6.38m0,12l-4.7,0l-4.17,3.34l-6.13,-5.93l-3,2.13l0,2.46l2.8,-2l6.2,6l5,-4l4,0l0,-2z" />
                    </g>
                  </svg>
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>{showSoundings ? 'Hide' : 'Show'} Soundings on Map</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Tabs
                  value={viewMode}
                  onValueChange={(value) => {
                    if (isMapViewMode(value)) setViewMode(value);
                  }}
                  className="h-9"
                >
                  <TabsList className="h-9">
                    <TabsTrigger
                      disabled={isHistoricData}
                      value={MAP_VIEW_MODES.STATIONS}
                      className="h-8"
                    >
                      Stations
                    </TabsTrigger>
                    <TabsTrigger
                      disabled={isHistoricData}
                      value={MAP_VIEW_MODES.SITES}
                      className="h-8"
                    >
                      Sites
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </TooltipTrigger>
              <TooltipContent>
                Switch between viewing weather stations or flying sites
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Select value={sport as string} onValueChange={(v) => setSport(v as SportType)}>
                    <SelectTrigger className="h-9 text-sm bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(SPORT_LABELS) as [SportType, string][]).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </span>
              </TooltipTrigger>
              <TooltipContent side="right">Wind colour scale for sport</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>

      {/* Top right controls */}
      <div className={`flex flex-col gap-2 items-end absolute top-2.5 right-2.5 z-50`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLocating(true)}
              className={getButtonStyle(isFlyingMode)}
            >
              <LocateFixed
                className={`${getIconStyle(isFlyingMode)} opacity-70 ${isLocating ? 'animate-ping' : ''}`}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Find My Location</TooltipContent>
        </Tooltip>
        {!isFlyingMode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                variant="outline"
                size="sm"
                onClick={() => {
                  const newUnit = unit === WIND_UNITS.KMH ? WIND_UNITS.KT : WIND_UNITS.KMH;
                  setUnit(newUnit);
                  toast.info(`Switched to ${newUnit === WIND_UNITS.KMH ? 'km/h' : 'knots'}`);
                }}
                className={`${getButtonStyle(isFlyingMode)} text-xs font-semibold bg-background`}
              >
                {unit === WIND_UNITS.KT ? 'kt' : 'km/h'}
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="left">
              Change unit to {unit === WIND_UNITS.KT ? 'km/h' : 'kt'}
            </TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              variant="outline"
              size="sm"
              onClick={onLayerToggle}
              className={`${getButtonStyle(isFlyingMode)} bg-background`}
            >
              <Layers className={`${getIconStyle(isFlyingMode)} opacity-70`} />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent side="left">Switch Map Layer</TooltipContent>
        </Tooltip>
        {!isFlyingMode && (
          <FilterDialog
            stationElevationFilter={stationElevationFilter}
            onStationElevationFilterChange={setStationElevationFilter}
            siteDirectionFilter={selectedSiteDirection}
            onSiteDirectionFilterChange={onSiteDirectionFilterChange}
            viewMode={viewMode}
          />
        )}
      </div>

      {/* History Slider at bottom */}
      {historyOffset < 0 && (
        <HistorySlider
          historyOffset={historyOffset}
          onHistoryChange={onHistoryChange}
          disabled={viewMode === MAP_VIEW_MODES.SITES}
        />
      )}

      {/* Bottom left - Recent Stations (hidden in history mode) */}
      {recentStations.length > 0 && !isFlyingMode && !isHistoricData && (
        <div className="absolute bottom-2.5 left-2.5 z-50">
          {effectiveMinimizeRecents ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleMinimizeRecents}
                  className={getButtonStyle(isFlyingMode)}
                >
                  <History className={`${getIconStyle(isFlyingMode)} opacity-70`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Show Recent Stations</TooltipContent>
            </Tooltip>
          ) : (
            <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-2 max-w-50">
              <div
                className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5 px-1 cursor-pointer hover:text-foreground transition-colors"
                onClick={toggleMinimizeRecents}
                title="Click to minimize"
              >
                <History className={`${getIconStyle(isFlyingMode)} h-3 w-3`} />
                <span>Recent Stations</span>
              </div>
              <div className="flex flex-col gap-1">
                {recentStations.map((station) => {
                  const displayName =
                    station.name.length > 14
                      ? `${station.name.slice(0, 7)}...${station.name.slice(-5)}`
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
