import React from 'react';
import { useNavigate } from 'react-router-dom';

import { convertWindSpeed } from '@/components/map';
import DirectionArrow from '@/components/ui/DirectionArrow';

import { getTextColor, getWindColorForSport, getWindDirectionFromBearing } from '@/lib/utils';
import type { Station } from '@/models/station.model';
import { useAppStore, useMapStore } from '@/store';

export const StationPreview: React.FC<{
  data: Station;
  distance: number | undefined;
}> = ({ data, distance }) => {
  const navigate = useNavigate();
  const sport = useAppStore((s) => s.sport);
  const unit = useMapStore((s) => s.unit);

  const color = getWindColorForSport(data.currentAverage ?? 0, sport);

  return (
    <button
      type="button"
      key={data._id}
      onClick={() => {
        navigate(`/stations/${data._id}`);
      }}
      className="rounded-lg p-2 text-center transition-colors hover:opacity-80 cursor-pointer"
      style={{
        backgroundColor: color,
        color: getTextColor(color)
      }}
    >
      <p className="truncate text-xs">{data.name}</p>
      <p className="text-lg font-medium">
        {data.currentAverage == null ? '-' : convertWindSpeed(data.currentAverage, unit)}
        {' | '}
        {data.currentGust == null ? '-' : convertWindSpeed(data.currentGust, unit)}
      </p>
      <div className="flex justify-center gap-2">
        {data.currentBearing == null ? (
          '-'
        ) : (
          <div className="flex items-center justify-center">
            <DirectionArrow
              className="h-4 w-4"
              style={{
                transform: `rotate(${Math.round(180 + data.currentBearing)}deg)`
              }}
            />
          </div>
        )}
        <p className="text-sm">{getWindDirectionFromBearing(data.currentBearing ?? -1)}</p>
      </div>
      {distance && <p className="text-xs">{(distance / 1000).toFixed(1)} km away</p>}
    </button>
  );
};
