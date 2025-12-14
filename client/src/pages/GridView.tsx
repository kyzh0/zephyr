import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { listStationsWithinRadius } from "@/services/station.service";
import {
  getDistance,
  getWindColor,
  getWindDirectionFromBearing,
} from "@/lib/utils";
import { convertWindSpeed, getStoredValue } from "@/components/map/map.utils";
import type { WindUnit } from "@/components/map/map.types";
import type { IStation } from "@/models/station.model";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { DirectionArrow } from "@/components/ui/DirectionArrow";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StationWithDistance extends IStation {
  distance?: number;
}

export default function GridView() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState("");
  const [data, setData] = useState<StationWithDistance[]>([]);
  const [radius, setRadius] = useState(() => 50);
  const [threshold, setThreshold] = useState(() => 0);

  const unit = getStoredValue<WindUnit>("unit", "kmh");

  const fetchData = useCallback((r: number) => {
    setLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const stations = await listStationsWithinRadius(
            pos.coords.latitude,
            pos.coords.longitude,
            r
          );

          if (stations?.length) {
            setData(
              stations.map(
                (station) =>
                  ({
                    ...station,
                    distance:
                      getDistance(
                        pos.coords.latitude,
                        pos.coords.longitude,
                        station.location.coordinates[1],
                        station.location.coordinates[0]
                      ) / 1000, // convert to km,
                  } as StationWithDistance)
              )
            );
          } else {
            setError(`No stations found within ${r}km`);
          }
        } catch {
          setError("Failed to load stations");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Please grant location permissions");
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    fetchData(radius);
  }, [fetchData, radius]);

  const handleRadiusChange = (value: number) => {
    setRadius(value);
  };

  const filteredData = data.filter(
    (s) => !s.isOffline && (s.currentAverage ?? 0) >= threshold
  );

  return (
    <Dialog open onOpenChange={() => navigate(-1)}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Nearby Stations</DialogTitle>
          <DialogDescription>
            Showing stations within {radius}km • Unit:{" "}
            {unit === "kt" ? "kt" : "km/h"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-6">
          <div className="flex-1 space-y-2">
            <Label className="text-xs">Radius: {radius} km</Label>
            <Slider
              value={[radius]}
              onValueChange={([value]) => handleRadiusChange(value)}
              step={10}
              min={20}
              max={150}
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label className="text-xs">
              Threshold:{" "}
              {unit === "kt"
                ? `${Math.round(threshold / 1.852)} kt`
                : `${threshold} km/h`}
            </Label>
            <Slider
              value={[threshold]}
              onValueChange={([value]) => setThreshold(value)}
              min={0}
              max={50}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <Skeleton className="h-40 w-full" />}

          {error && (
            <p className="text-center text-sm text-destructive py-4">{error}</p>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-3 gap-2">
              {filteredData.map((s) => {
                const color =
                  s.currentAverage != null
                    ? getWindColor(s.currentAverage + 10)
                    : undefined;
                return (
                  <button
                    type="button"
                    key={s._id}
                    onClick={() => {
                      navigate(`/stations/${s._id}`);
                    }}
                    className="rounded-lg p-2 text-center transition-colors hover:opacity-80"
                    style={{
                      backgroundColor: color ?? "hsl(var(--muted))",
                    }}
                  >
                    <p className="truncate text-xs">{s.name}</p>
                    <p className="text-lg font-medium">
                      {s.currentAverage == null
                        ? "-"
                        : convertWindSpeed(s.currentAverage, unit)}
                      {" | "}
                      {s.currentGust == null
                        ? "-"
                        : convertWindSpeed(s.currentGust, unit)}
                    </p>
                    <div className="flex justify-center gap-2">
                      {s.currentBearing == null ? (
                        "-"
                      ) : (
                        <div className="flex items-center justify-center">
                          <DirectionArrow
                            className="h-4 w-4"
                            style={{
                              transform: `rotate(${Math.round(
                                180 + s.currentBearing
                              )}deg)`,
                            }}
                          />
                        </div>
                      )}
                      <p className="text-sm">
                        {getWindDirectionFromBearing(s.currentBearing ?? -1)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {s.distance?.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}{" "}
                      km away
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
