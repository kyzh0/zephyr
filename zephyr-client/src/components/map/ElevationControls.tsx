import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Mountain } from "lucide-react";

interface ElevationControlsProps {
  showElevation: boolean;
  elevationFilter: number;
  onToggleElevation: () => void;
  onElevationChange: (value: number) => void;
}

export function ElevationControls({
  showElevation,
  elevationFilter,
  onToggleElevation,
  onElevationChange,
}: ElevationControlsProps) {
  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="absolute top-[115px] right-2.5 z-50 w-[29px] h-[29px] bg-white shadow-[0_0_0_2px_rgba(0,0,0,0.1)]"
        onClick={onToggleElevation}
      >
        <Mountain
          className={`h-4 w-4 ${showElevation ? "opacity-100" : "opacity-70"}`}
        />
      </Button>
      <div className="absolute top-[165px] right-1 z-50 h-[60px] px-5">
        <Slider
          orientation="vertical"
          value={[elevationFilter]}
          onValueChange={(value) => onElevationChange(value[0])}
          min={0}
          max={1500}
          step={250}
          className="h-full"
        />
      </div>
      {elevationFilter > 0 && (
        <div className="absolute top-[225px] right-[7px] z-50 bg-white rounded px-1 text-[10px] text-center w-[35px]">
          &gt;{elevationFilter}
        </div>
      )}
    </>
  );
}
