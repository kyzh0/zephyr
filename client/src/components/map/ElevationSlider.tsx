import { useState, useCallback } from "react";
import { CircleDashed, Mountain } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

interface ElevationSliderProps {
  showElevation: boolean;
  elevationFilter: number;
  onToggleElevation: () => void;
  onElevationChange: (value: number) => void;
  disabled?: boolean;
}

export function ElevationSlider({
  showElevation,
  elevationFilter,
  onToggleElevation,
  onElevationChange,
  disabled = false,
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
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-9 w-9"
        >
          <Mountain
            className={`h-4 w-4 ${
              isFilterActive ? "fill-blue-500 stroke-blue-500" : "opacity-70"
            }`}
          />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="p-0 mr-2 w-50" align="start" sideOffset={4}>
        <div className="flex flex-col gap-2 bg-background border rounded-md p-2 shadow-sm min-w-[200px]">
          <div className="text-xs text-muted-foreground">
            {elevationFilter > 0
              ? `Showing stations above ${elevationFilter}m`
              : "Showing all elevations"}
          </div>

          <div className="flex items-center gap-2 px-1">
            <span className="text-xs text-muted-foreground w-4">0</span>
            <Slider
              value={[elevationFilter]}
              onValueChange={handleSliderChange}
              min={0}
              max={1500}
              step={250}
              className="flex-1"
              disabled={disabled}
            />
            <span className="text-xs text-muted-foreground w-8">1500m</span>
          </div>

          {/* Borders toggle */}
          <Toggle
            variant="outline"
            size="sm"
            pressed={showElevation}
            onClick={onToggleElevation}
            className="w-full text-xs data-[state=on]:border-blue-500"
          >
            <CircleDashed
              className={`h-4 w-4 mr-2 ${
                showElevation ? "fill-blue-500 stroke-blue-500" : "opacity-70"
              }`}
            />
            {showElevation ? "Borders on" : "Borders off"}
          </Toggle>
        </div>
      </PopoverContent>
    </Popover>
  );
}
