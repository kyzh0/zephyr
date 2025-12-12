import { useState, useCallback } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { X, ChevronLeft, ChevronRight, Hourglass } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HistorySliderProps {
  historyOffset: number;
  onHistoryChange: (offset: number) => void;
  disabled?: boolean;
}

/**
 * Calculate the snapshot time based on offset (in minutes from current time)
 * Rounds to nearest 30-minute mark
 */
function getSnapshotTime(offset: number): Date {
  const now = new Date();
  const minutesPast30 = now.getMinutes() % 30;
  const roundedTime = new Date(
    now.getTime() -
      (minutesPast30 - offset) * 60 * 1000 -
      now.getSeconds() * 1000 -
      now.getMilliseconds()
  );
  return roundedTime;
}

export function HistorySlider({
  historyOffset,
  onHistoryChange,
  disabled = false,
}: HistorySliderProps) {
  const [isExpanded, setIsExpanded] = useState(historyOffset < 0);

  const handleSliderChange = useCallback(
    (value: number[]) => {
      onHistoryChange(value[0]);
    },
    [onHistoryChange]
  );

  const handleLeftClick = useCallback(() => {
    // Go back 30 minutes (more negative)
    const newOffset = Math.max(historyOffset - 30, -10080); // Max 7 days back
    onHistoryChange(newOffset);
  }, [historyOffset, onHistoryChange]);

  const handleRightClick = useCallback(() => {
    // Go forward 30 minutes (less negative, toward 0)
    const newOffset = Math.min(historyOffset + 30, 0);
    onHistoryChange(newOffset);
  }, [historyOffset, onHistoryChange]);

  const handleClose = useCallback(() => {
    onHistoryChange(0);
    setIsExpanded(false);
  }, [onHistoryChange]);

  const handleToggle = useCallback(() => {
    if (isExpanded && historyOffset === 0) {
      setIsExpanded(false);
    } else if (!isExpanded) {
      setIsExpanded(true);
    }
  }, [isExpanded, historyOffset]);

  const snapshotTime = getSnapshotTime(historyOffset);

  if (!isExpanded) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            disabled={disabled}
            className="h-9 w-9"
          >
            <Hourglass className="h-4 w-4 opacity-70" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>View Historical Data</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex flex-col gap-2 bg-background border rounded-md p-2 shadow-sm min-w-[180px]">
      {/* Slider */}
      <div className="flex items-center gap-2">
        <Slider
          defaultValue={[historyOffset]}
          onValueCommit={handleSliderChange}
          min={-10080} // 7 days in minutes
          max={0}
          step={30}
          className="flex-1"
          disabled={disabled}
        />
      </div>

      {/* Controls and time display */}
      <div className="flex items-center justify-between">
        <div className="w-6" /> {/* Spacer for alignment */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLeftClick}
            className="h-6 w-6"
            disabled={historyOffset <= -10080}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="text-center min-w-[140px]">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Historic Data
            </p>
            <p className="text-sm font-medium">
              {formatInTimeZone(
                snapshotTime,
                "Pacific/Auckland",
                "EEE dd MMM HH:mm"
              )}
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleRightClick}
            className="h-6 w-6"
            disabled={historyOffset >= 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="h-6 w-6"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
