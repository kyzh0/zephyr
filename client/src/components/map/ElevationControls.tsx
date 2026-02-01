import { Slider } from '@/components/ui/slider';
import { Mountain } from 'lucide-react';
import { toast } from 'sonner';
import { Toggle } from '../ui/toggle';

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
  onElevationChange
}: ElevationControlsProps) {
  const notifyElevationChange = (value: number) => {
    // Notify only when elevation filter is greater than 0
    if (value > 0) {
      toast.success(`Only showing stations higher than ${value}m`);
    }
  };

  return (
    <div className="absolute top-12 right-0.5 z-50 flex flex-col items-center gap-2">
      <Toggle
        variant="outline"
        size="sm"
        className="bg-background data-[state=on]:*:[svg]:fill-blue-500 data-[state=on]:*:[svg]:stroke-blue-500"
        onClick={onToggleElevation}
      >
        <Mountain className={`h-4 w-4 ${showElevation ? 'opacity-100' : 'opacity-70'}`} />
      </Toggle>
      <div className="h-[60px] px-5">
        <Slider
          orientation="vertical"
          value={[elevationFilter]}
          onValueChange={(value) => onElevationChange(value[0])}
          onValueCommit={(value) => notifyElevationChange(value[0])}
          min={0}
          max={1500}
          step={250}
          className="h-full"
        />
      </div>
      {elevationFilter > 0 && (
        <div className="z-51 bg-white rounded px-1 text-xs text-center">&gt;{elevationFilter}m</div>
      )}
    </div>
  );
}
