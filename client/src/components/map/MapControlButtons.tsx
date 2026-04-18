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
import { SPORT_LABELS, type MapControlsState, type SportType } from './map.types';

import { getButtonStyle, getIconStyle } from '@/lib/utils';
import {
  getRecentStations,
  RECENT_STATIONS_UPDATED_EVENT,
  type RecentStation
} from '@/services/recent-stations.service';
import { useIsMobile } from '@/hooks';
import { useAppContext } from '@/context/AppContext';

export function MapControlButtons({
  overlay,
  onWebcamClick,
  onSoundingClick,
  onLayerToggle,
  onLocateClick,
  unit,
  onUnitToggle,
  historyOffset,
  onHistoryChange,
  isHistoricData,
  stationElevationFilter,
  onStationElevationFilterChange,
  minimizeRecents,
  onRecentsToggle,
  viewMode,
  onToggleViewMode,
  siteDirectionFilter,
  onSiteDirectionFilterChange,
  onSearchSelect
}: MapControlsState) {
  const showWebcams = overlay === 'webcams';
  const showSoundings = overlay === 'soundings';
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { flyingMode, toggleFlyingMode, sport, setSport } = useAppContext();
  const isFlyingMode = flyingMode && isMobile;

  const [isLocating, setIsLocating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [recentStations, setRecentStations] = useState<RecentStation[]>([]);

  // Load recent stations on mount and when localStorage changes
  useEffect(() => {
    const loadRecentStations = () => {
      setRecentStations(getRecentStations());
    };

    loadRecentStations();

    // Listen for storage changes (in case another tab updates)
    window.addEventListener('storage', loadRecentStations);

    // Listen for custom event when recent stations are updated
    window.addEventListener(RECENT_STATIONS_UPDATED_EVENT, loadRecentStations);

    // Also refresh when the component becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadRecentStations();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('storage', loadRecentStations);
      window.removeEventListener(RECENT_STATIONS_UPDATED_EVENT, loadRecentStations);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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
    if (localStorage.getItem('welcomeDismissed') !== 'true') {
      navigate('/help');
    }
  }, [navigate]);

  // Render menu button content
  const renderMenuContent = () => (
    <div className="flex flex-col gap-0">
      <div className="px-2 py-1.5">
        <Tabs
          value={viewMode}
          onValueChange={(value) => {
            onToggleViewMode(value as 'stations' | 'sites');
            setMenuOpen(false);
          }}
          className="h-9"
        >
          <TabsList className="h-9 w-full">
            <TabsTrigger disabled={isHistoricData} value="stations" className="h-8 flex-1">
              Stations
            </TabsTrigger>
            <TabsTrigger disabled={isHistoricData} value="sites" className="h-8 flex-1">
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
        disabled={isHistoricData || viewMode === 'sites'}
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
          onSoundingClick();
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
              onToggleViewMode('stations');
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
              onClick={onWebcamClick}
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
                  disabled={viewMode === 'sites'}
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
                  onClick={onWebcamClick}
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
                  onClick={onSoundingClick}
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
                  onValueChange={(value) => onToggleViewMode(value as 'stations' | 'sites')}
                  className="h-9"
                >
                  <TabsList className="h-9">
                    <TabsTrigger disabled={isHistoricData} value="stations" className="h-8">
                      Stations
                    </TabsTrigger>
                    <TabsTrigger disabled={isHistoricData} value="sites" className="h-8">
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
                onClick={onUnitToggle}
                className={`${getButtonStyle(isFlyingMode)} text-xs font-semibold bg-background`}
              >
                {unit === 'kt' ? 'kt' : 'km/h'}
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="left">
              Change unit to {unit === 'kt' ? 'km/h' : 'kt'}
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
            onStationElevationFilterChange={onStationElevationFilterChange}
            siteDirectionFilter={siteDirectionFilter}
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
          disabled={viewMode === 'sites'}
        />
      )}

      {/* Bottom left - Recent Stations (hidden in history mode) */}
      {recentStations.length > 0 && !isFlyingMode && !isHistoricData && (
        <div className="absolute bottom-2.5 left-2.5 z-50">
          {minimizeRecents ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRecentsToggle}
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
                onClick={onRecentsToggle}
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
