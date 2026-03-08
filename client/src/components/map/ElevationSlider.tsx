import { useState, useCallback } from 'react';
import { Mountain } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

interface ElevationSliderProps {
  elevationFilter: number;
  onElevationChange: (value: number) => void;
  disabled?: boolean;
  flyingMode?: boolean;
}

export function ElevationSlider({
  elevationFilter,
  onElevationChange,
  disabled = false,
  flyingMode = false
}: ElevationSliderProps) {
  const flyBtn = flyingMode ? 'h-[3.375rem] w-[3.375rem]' : 'h-9 w-9';
  const flyIcon = flyingMode ? 'h-6 w-6' : 'h-4 w-4';
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSliderChange = useCallback(
    (value: number[]) => {
      onElevationChange(value[0]);
    },
    [onElevationChange]
  );

  // Determine if filter is active (has a value > 0)
  const isFilterActive = elevationFilter > 0;

  return (
    <Popover open={isExpanded} onOpenChange={setIsExpanded}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className={flyBtn}>
          <Mountain
            className={`${flyIcon} ${isFilterActive ? 'fill-blue-500 stroke-blue-500' : 'opacity-70'}`}
          />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="p-0" align="end">
        <div className="flex flex-col gap-4 bg-background border rounded-md p-3 shadow-sm min-w-[250px]">
          <div className="text-xs text-muted-foreground">
            {elevationFilter > 0
              ? `Showing stations above ${elevationFilter}m`
              : 'Showing stations at all elevations'}
          </div>

          <Slider
            value={[elevationFilter]}
            onValueChange={handleSliderChange}
            min={0}
            max={1500}
            step={250}
            className="flex-1"
            disabled={disabled}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
