import { useState, useCallback } from 'react';
import { Filter, Mountain } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getWindDirectionFromBearing } from '@/lib/utils';
import { WindCompass } from '@/components/station/WindCompass';

interface FilterDialogProps {
  stationElevationFilter: number;
  onStationElevationFilterChange: (value: number) => void;
  siteDirectionFilter: number | null;
  onSiteDirectionFilterChange: (bearing: number | null) => void;
  viewMode?: 'stations' | 'sites';
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

  const isStationsView = viewMode === 'stations';
  const isSitesView = viewMode === 'sites';

  const handleElevationChange = useCallback(
    (value: number[]) => {
      onStationElevationFilterChange(value[0]);
    },
    [onStationElevationFilterChange]
  );

  const handleSiteDirectionChange = useCallback(
    (value: number[]) => {
      const v = value[0];
      onSiteDirectionFilterChange(v === 0 ? null : v);
    },
    [onSiteDirectionFilterChange]
  );

  const isStationElevationActive = stationElevationFilter > 0;
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
                <div className="flex flex-col items-center shrink-0 w-9">
                  <Mountain
                    className={`h-4 w-4 ${isStationElevationActive ? 'stroke-blue-500' : 'opacity-70'}`}
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    {stationElevationFilter > 0 ? `>${stationElevationFilter}m` : 'All'}
                  </span>
                </div>
                <Slider
                  value={[stationElevationFilter]}
                  onValueChange={handleElevationChange}
                  min={0}
                  max={1500}
                  step={250}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Wind direction filter */}
            <div className={`flex flex-col gap-2 ${isSitesView ? '' : 'hidden'}`}>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center shrink-0 w-9">
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
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex justify-between text-[8px]">
                    <span>&nbsp;&nbsp;&nbsp;</span>
                    <span>E</span>
                    <span>S</span>
                    <span>W</span>
                    <span>N</span>
                  </div>
                  <Slider
                    value={[siteDirectionFilter ?? 0]}
                    onValueChange={handleSiteDirectionChange}
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
