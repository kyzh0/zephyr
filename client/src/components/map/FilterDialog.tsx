import { useState } from 'react';
import { Filter, Mountain } from 'lucide-react';

import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { WindCompass } from '@/components/station';
import {
  ELEVATION_FILTER_MIN,
  ELEVATION_FILTER_MAX,
  MAP_VIEW_MODES,
  type MapViewMode
} from './map.types';

import { getWindDirectionFromBearing } from '@/lib/utils';

interface FilterDialogProps {
  stationElevationFilter: [number, number];
  onStationElevationFilterChange: (value: [number, number]) => void;
  siteDirectionFilter: number | null;
  onSiteDirectionFilterChange: (bearing: number | null) => void;
  viewMode?: MapViewMode;
}

const BEARING_STEP = 22.5;

export function FilterDialog({
  stationElevationFilter,
  onStationElevationFilterChange,
  siteDirectionFilter,
  onSiteDirectionFilterChange,
  viewMode
}: FilterDialogProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isStationsView = viewMode === MAP_VIEW_MODES.STATIONS;
  const isSitesView = viewMode === MAP_VIEW_MODES.SITES;

  const [minElev, maxElev] = stationElevationFilter;
  const isStationElevationActive = minElev > ELEVATION_FILTER_MIN || maxElev < ELEVATION_FILTER_MAX;
  const isSiteDirectionActive = siteDirectionFilter !== null;
  const isFilterActive =
    (isStationsView && isStationElevationActive) || (isSitesView && isSiteDirectionActive);

  return (
    <Tooltip>
      <Popover open={isExpanded} onOpenChange={setIsExpanded}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 w-9">
              <Filter
                className={`h-4 w-4 ${isFilterActive ? 'fill-blue-500 stroke-blue-500' : 'opacity-70'}`}
              />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>

        <PopoverContent className="p-0" align="end">
          <div className="flex flex-col gap-4 bg-background border rounded-md p-3 shadow-sm min-w-62.5">
            {/* Elevation filter */}
            <div className={`flex flex-col gap-2 ${isStationsView ? '' : 'hidden'}`}>
              <div className="flex items-center gap-2">
                <div
                  className="flex flex-col items-center shrink-0 w-12 cursor-pointer"
                  onClick={() =>
                    onStationElevationFilterChange([ELEVATION_FILTER_MIN, ELEVATION_FILTER_MAX])
                  }
                >
                  <Mountain
                    className={`h-4 w-4 ${isStationElevationActive ? 'stroke-blue-500' : 'opacity-70'}`}
                  />
                  <div className="text-[10px] text-muted-foreground mt-0.5 text-center h-6 flex items-center justify-center">
                    {isStationElevationActive ? (
                      <span className="flex flex-col items-center leading-tight">
                        <span>{minElev}m -</span>
                        <span>{maxElev}m</span>
                      </span>
                    ) : (
                      'All'
                    )}
                  </div>
                </div>
                <Slider
                  value={[minElev, maxElev]}
                  onValueChange={(v) => onStationElevationFilterChange([v[0], v[1]])}
                  min={ELEVATION_FILTER_MIN}
                  max={ELEVATION_FILTER_MAX}
                  step={100}
                  minStepsBetweenThumbs={1}
                  className="flex-1 ml-1"
                />
              </div>
            </div>

            {/* Wind direction filter */}
            <div className={`flex flex-col gap-2 ${isSitesView ? '' : 'hidden'}`}>
              <div className="flex items-center gap-2">
                <div
                  className="flex flex-col items-center shrink-0 w-9 cursor-pointer"
                  onClick={() => onSiteDirectionFilterChange(null)}
                >
                  <WindCompass
                    bearing={siteDirectionFilter}
                    validBearings={undefined}
                    containerSize={{ width: 30, height: 30 }}
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 min-w-9 text-center">
                    {isSiteDirectionActive ? (
                      <span className="flex flex-col items-center">
                        {getWindDirectionFromBearing(siteDirectionFilter)}
                      </span>
                    ) : (
                      'All'
                    )}
                  </span>
                </div>
                <div className="flex flex-col gap-2 w-full ml-3">
                  <div className="flex justify-between text-[8px]">
                    <span>&nbsp;&nbsp;&nbsp;</span>
                    <span>E</span>
                    <span>S</span>
                    <span>W</span>
                    <span>N</span>
                  </div>
                  <Slider
                    value={[siteDirectionFilter ?? 0]}
                    onValueChange={(v) => onSiteDirectionFilterChange(v[0] === 0 ? null : v[0])}
                    min={0}
                    max={360}
                    step={BEARING_STEP}
                    className="flex-1 mb-3"
                  />
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <TooltipContent side="left">Filters</TooltipContent>
    </Tooltip>
  );
}
