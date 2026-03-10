import { useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { WindCompass } from '@/components/station/WindCompass';
import { getWindDirectionFromBearing } from '@/lib/utils';

interface WindDirectionSliderProps {
  windBearing: number | null;
  onWindBearingChange: (bearing: number | null) => void;
}

export function WindDirectionSlider({
  windBearing,
  onWindBearingChange
}: WindDirectionSliderProps) {
  const handleSliderChange = useCallback(
    (value: number[]) => {
      onWindBearingChange(value[0]);
    },
    [onWindBearingChange]
  );

  const handleClear = useCallback(() => {
    onWindBearingChange(null);
  }, [onWindBearingChange]);

  const label =
    windBearing !== null
      ? `Filtering sites by ${windBearing}° ${getWindDirectionFromBearing(windBearing)}`
      : 'No wind direction filter applied';

  return (
    <div className="fixed inset-x-0 bottom-4 z-100 flex justify-center w-full px-4">
      <div className="flex items-center gap-4 bg-background border-2 border-border p-4 rounded-lg shadow-lg w-[80vw] max-w-md">
        {/* Compass preview */}
        <WindCompass
          bearing={windBearing}
          validBearings={undefined}
          containerSize={{ width: 160, height: 160 }}
        />

        {/* Slider + label */}
        <div className="flex flex-col flex-grow gap-2 min-w-48 sm:min-w-64">
          <div className="text-center text-base">
            {label}{' '}
            {windBearing && (
              <span
                onClick={handleClear}
                className="cursor-pointer text-blue-500 underline"
                aria-label="Clear wind filter"
              >
                Clear
              </span>
            )}
          </div>
          <Slider
            value={[windBearing ?? 0]}
            onValueChange={handleSliderChange}
            min={0}
            max={359}
            step={5}
          />
        </div>
      </div>
    </div>
  );
}
