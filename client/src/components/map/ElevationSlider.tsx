import { useState, useCallback } from 'react';
import { Mountain } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

interface ElevationSliderProps {
  elevationFilter: number;
  onElevationChange: (value: number) => void;
  disabled?: boolean;
}

export function ElevationSlider({
  elevationFilter,
  onElevationChange,
  disabled = false
}: ElevationSliderProps) {
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
        <Button variant="outline" size="sm" disabled={disabled} className="h-9 w-9">
          <Mountain
            className={`h-4 w-4 ${isFilterActive ? 'fill-blue-500 stroke-blue-500' : 'opacity-70'}`}
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
