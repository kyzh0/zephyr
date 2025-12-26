import React from "react";
import { useNavigate } from "react-router-dom";
import { convertWindSpeed, getStoredValue, getWindColor } from "../map";
import { getWindDirectionFromBearing } from "@/lib/utils";
import DirectionArrow from "../ui/DirectionArrow";
import type { WindUnit } from "./types";
import type { StationWithDistance } from "@/hooks/useStations";

interface StationPreviewProps {
  station: StationWithDistance;
}

export const StationPreview: React.FC<StationPreviewProps> = ({ station }) => {
  const navigate = useNavigate();

  const color =
    station.currentAverage != null
      ? getWindColor(station.currentAverage + 10)
      : undefined;
  const unit = getStoredValue<WindUnit>("unit", "kmh");

  return (
    <button
      type="button"
      key={station._id}
      onClick={() => {
        navigate(`/stations/${station._id}`);
      }}
      className="rounded-lg p-2 text-center transition-colors hover:opacity-80"
      style={{
        backgroundColor: color ?? "hsl(var(--muted))",
      }}
    >
      <p className="truncate text-xs">{station.name}</p>
      <p className="text-lg font-medium">
        {station.currentAverage == null
          ? "-"
          : convertWindSpeed(station.currentAverage, unit)}
        {" | "}
        {station.currentGust == null
          ? "-"
          : convertWindSpeed(station.currentGust, unit)}
      </p>
      <div className="flex justify-center gap-2">
        {station.currentBearing == null ? (
          "-"
        ) : (
          <div className="flex items-center justify-center">
            <DirectionArrow
              className="h-4 w-4"
              style={{
                transform: `rotate(${Math.round(
                  180 + station.currentBearing
                )}deg)`,
              }}
            />
          </div>
        )}
        <p className="text-sm">
          {getWindDirectionFromBearing(station.currentBearing ?? -1)}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        {station.distance?.toLocaleString(undefined, {
          maximumFractionDigits: 0,
        })}{" "}
        km away
      </p>
    </button>
  );
};
