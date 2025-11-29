import { useState, useCallback } from "react";
import { Mountain } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const [isExpanded, setIsExpanded] = useState(
    elevationFilter > 0 || showElevation
  );

  const handleSliderChange = useCallback(
    (value: number[]) => {
      onElevationChange(value[0]);
    },
    [onElevationChange]
  );

  const handleExpand = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const handleClose = useCallback(() => {
    onElevationChange(0);
    setIsExpanded(false);
  }, [onElevationChange]);

  if (!isExpanded) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExpand}
            disabled={disabled}
          >
            <Mountain className="h-4 w-4 opacity-70" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Elevation Controls</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex flex-col gap-2 bg-background border rounded-md p-2 shadow-sm min-w-[200px]">
      {/* Header with toggle and close */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                variant="outline"
                size="sm"
                pressed={showElevation}
                onClick={onToggleElevation}
                className="h-7 w-7 p-0 data-[state=on]:*:[svg]:fill-blue-500 data-[state=on]:*:[svg]:stroke-blue-500"
              >
                <Mountain className="h-4 w-4 opacity-70" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>
              Shows borders around clusters of stations meeting the elevation
              criteria.
            </TooltipContent>
          </Tooltip>
          <span className="text-xs text-muted-foreground">
            {showElevation ? "Borders on" : "Borders off"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="h-6 text-xs"
        >
          Close
        </Button>
      </div>

      {/* Slider */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">
          {elevationFilter > 0
            ? `Showing stations above ${elevationFilter}m`
            : "Showing all elevations"}
        </span>
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
      </div>
    </div>
  );
}
