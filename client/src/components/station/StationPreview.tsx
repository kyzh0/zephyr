import React from "react";
import { useNavigate } from "react-router-dom";
import { convertWindSpeed, getStoredValue, getWindColor } from "../map";
import { getWindDirectionFromBearing } from "@/lib/utils";
import DirectionArrow from "../ui/DirectionArrow";
import type { WindUnit } from "./types";
import type { IStation } from "@/models/station.model";

export const StationPreview: React.FC<{
  data: IStation;
  distance: number | undefined;
}> = ({ data, distance }) => {
  const navigate = useNavigate();

  const color =
    data.currentAverage != null
      ? getWindColor(data.currentAverage + 10)
      : undefined;
  const unit = getStoredValue<WindUnit>("unit", "kmh");

  return (
    <button
      type="button"
      key={data._id}
      onClick={() => {
        navigate(`/stations/${data._id}`);
      }}
      className="rounded-lg p-2 text-center transition-colors hover:opacity-80 cursor-pointer"
      style={{
        backgroundColor: color ?? "hsl(var(--muted))",
      }}
    >
      <p className="truncate text-xs">{data.name}</p>
      <p className="text-lg font-medium">
        {data.currentAverage == null
          ? "-"
          : convertWindSpeed(data.currentAverage, unit)}
        {" | "}
        {data.currentGust == null
          ? "-"
          : convertWindSpeed(data.currentGust, unit)}
      </p>
      <div className="flex justify-center gap-2">
        {data.currentBearing == null ? (
          "-"
        ) : (
          <div className="flex items-center justify-center">
            <DirectionArrow
              className="h-4 w-4"
              style={{
                transform: `rotate(${Math.round(
                  180 + data.currentBearing,
                )}deg)`,
              }}
            />
          </div>
        )}
        <p className="text-sm">
          {getWindDirectionFromBearing(data.currentBearing ?? -1)}
        </p>
      </div>
      {distance && (
        <p className="text-xs text-muted-foreground">
          {(distance / 1000).toFixed(1)} km away
        </p>
      )}
    </button>
  );
};
