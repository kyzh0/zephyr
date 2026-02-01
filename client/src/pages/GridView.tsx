import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredValue } from '@/components/map/map.utils';
import type { WindUnit } from '@/components/map/map.types';
import { useNearbyStations } from '@/hooks';

import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { StationPreview } from '@/components/station/StationPreview';

export default function GridView() {
  const navigate = useNavigate();
  const [radius, setRadius] = useState(50);
  const [threshold, setThreshold] = useState(0);
  const unit = getStoredValue<WindUnit>('unit', 'kmh');

  // Get user's location (fallback to 0,0 if not available)
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 0,
    lng: 0
  });
  const [locationError, setLocationError] = useState(false);
  React.useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationError(false);
      },
      () => {
        setCoords({ lat: 0, lng: 0 });
        setLocationError(true);
      }
    );
  }, []);

  const {
    data: stations,
    isLoading: loading,
    error
  } = useNearbyStations({
    lat: coords.lat,
    lon: coords.lng,
    maxDistance: radius * 1000
  });

  const handleRadiusChange = (value: number) => setRadius(value);

  const filteredData = stations.filter(
    (s) => !s.data.isOffline && (s.data.currentAverage ?? 0) >= threshold
  );

  return (
    <Dialog open onOpenChange={() => navigate(-1)}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Nearby Stations</DialogTitle>
          <DialogDescription>
            Showing stations within {radius}km • Unit: {unit === 'kt' ? 'kt' : 'kmh'}
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
              Threshold:{' '}
              {unit === 'kt' ? `${Math.round(threshold / 1.852)} kt` : `${threshold} kmh`}
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

          {locationError && (
            <div className="flex flex-col items-center justify-center h-40">
              <p className="text-center text-sm text-destructive py-4">
                Location permission is required to show nearby stations.
                <br />
                Please enable location access in your browser settings.
              </p>
            </div>
          )}

          {!loading && !locationError && error && (
            <p className="text-center text-sm text-destructive py-4">
              {error.message || String(error)}
            </p>
          )}

          {!loading && !locationError && !error && filteredData.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40">
              <p className="text-center text-muted-foreground py-4">
                No stations found for your location and filters.
              </p>
            </div>
          )}

          {!loading && !locationError && !error && filteredData.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {filteredData.map((station) => (
                <StationPreview
                  key={station.data._id}
                  data={station.data}
                  distance={station.distance}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
