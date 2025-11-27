import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { listStationsWithinRadius } from "@/services/station.service";
import {
  getDistance,
  getWindColor,
  getWindDirectionFromBearing,
} from "@/lib/utils";
import { getStoredValue, setStoredValue, convertWindSpeed } from "./map.utils";
import type { WindUnit } from "./map.types";
import type { IStation } from "@/models/station.model";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";

interface StationWithDistance extends IStation {
  distance?: number;
}

interface GridViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GridViewDialog({ open, onOpenChange }: GridViewDialogProps) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<StationWithDistance[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [radius, setRadius] = useState(() => getStoredValue("gridRadius", 50));
  const [threshold, setThreshold] = useState(() =>
    getStoredValue("gridThreshold", 0)
  );

  const unit = getStoredValue<WindUnit>("unit", "kmh");

  const fetchData = (r: number) => {
    setLoading(true);
    setError("");
    setHasFetched(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
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
                  distance: getDistance(
                    pos.coords.latitude,
                    pos.coords.longitude,
                    station.location.coordinates[1],
                    station.location.coordinates[0]
                  ),
                } as StationWithDistance)
            )
          );
        } else {
          setError(`No stations found within ${r}km`);
        }
        setLoading(false);
      },
      () => {
        setError("Please grant location permissions");
        setLoading(false);
      }
    );
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && !hasFetched) {
      fetchData(radius);
    }
    onOpenChange(isOpen);
  };

  // Persist settings
  useEffect(() => {
    setStoredValue("gridRadius", radius);
  }, [radius]);

  useEffect(() => {
    setStoredValue("gridThreshold", threshold);
  }, [threshold]);

  const handleRadiusChange = (value: number) => {
    setRadius(value);
    fetchData(value);
  };

  const filteredData = data.filter(
    (s) => !s.isOffline && (s.currentAverage ?? 0) >= threshold
  );

  handleOpenChange(open);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogTitle className="sr-only">Nearby Stations</DialogTitle>
        <DialogHeader>
          <div className="flex justify-between items-start gap-4">
            <div className="flex gap-4">
              <div className="flex flex-col items-center w-20">
                <Slider
                  value={[radius]}
                  onValueChange={([value]) => handleRadiusChange(value)}
                  step={50}
                  min={50}
                  max={150}
                  className="w-12 mb-1"
                />
                <span className="text-xs text-muted-foreground">
                  Radius: {radius} km
                </span>
              </div>
              <div className="flex flex-col items-center w-24">
                <Slider
                  value={[threshold]}
                  onValueChange={([value]) => setThreshold(value)}
                  min={0}
                  max={50}
                  className="w-12 mb-1"
                />
                <span className="text-xs text-muted-foreground">
                  Threshold:{" "}
                  {unit === "kt"
                    ? `${Math.round(threshold / 1.852)} kt`
                    : `${threshold} km/h`}
                </span>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">
              Unit: {unit === "kt" ? "kt" : "km/h"}
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-2">
          {loading && <Skeleton className="h-[20vh] w-full" />}

          {error && <p className="text-center text-red-500 my-4">{error}</p>}

          {!loading && !error && (
            <div className="grid grid-cols-3 gap-2">
              {filteredData.map((s) => {
                const color =
                  s.currentAverage != null
                    ? getWindColor(s.currentAverage + 10)
                    : "";
                return (
                  <div
                    key={s._id}
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/stations/${s._id}`);
                    }}
                    className="p-2 rounded-lg cursor-pointer transition-colors"
                    style={{
                      backgroundColor: color || "rgba(168, 168, 168, 0.1)",
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs text-center truncate">
                        {s.name}
                      </span>
                      <span className="text-lg text-center font-medium">
                        {s.currentAverage == null
                          ? "-"
                          : convertWindSpeed(s.currentAverage, unit)}
                        {" | "}
                        {s.currentGust == null
                          ? "-"
                          : convertWindSpeed(s.currentGust, unit)}
                      </span>
                      <span className="text-sm text-center">
                        {getWindDirectionFromBearing(s.currentBearing ?? -1)}
                      </span>
                      <span className="text-xs text-center text-muted-foreground">
                        {s.distance} km
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
