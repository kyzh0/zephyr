import { useEffect, useRef } from 'react';
import { ParticleMotion, SmoothRaster } from 'mapbox-exif-layer';
import type { LngLatBounds, Map as MapboxMap } from 'mapbox-gl';

import type { SportType } from '@/components/map';
import { useStations } from '@/hooks';
import { WindField, type WindStation } from '@/lib/wind-field-compact';
import { getWindColorForSport } from '@/lib/utils';
import type { HistoricalStationData } from '@/models/station-data.model';
import type { Station } from '@/models/station.model';
import { loadAllStationDataAtTimestamp } from '@/services/station.service';
import { getSnapshotTime } from './useMapControls';

const PARTICLE_LAYER_ID = 'wind-field-particles';
const SPEED_LAYER_ID = 'wind-field-speed';
const GRID_WIDTH = 160;
const GRID_HEIGHT = 120;
const MIN_CONFIDENCE = 0;
const VELOCITY_RANGE_MPS: [number, number] = [0, 36];

interface UseWindFieldOverlayOptions {
  map: React.RefObject<MapboxMap | null>;
  isMapLoaded: boolean;
  isVisible: boolean;
  historyOffset: number;
  sport: SportType;
}

interface WindTexture {
  velocityUrl: string;
  speedUrl: string;
  bounds: [number, number, number, number];
}

function toWindStation(
  station: Station,
  speed: number | null | undefined,
  direction: number | null | undefined,
  timestamp: number | string | Date,
  isOffline = station.isOffline
): WindStation | null {
  const [longitude, latitude] = station.location.coordinates;
  if (
    isOffline ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    speed == null ||
    direction == null ||
    !Number.isFinite(speed) ||
    !Number.isFinite(direction) ||
    speed < 0
  ) {
    return null;
  }

  return {
    id: station._id,
    lat: latitude,
    lon: longitude,
    windSpeed: speed,
    windDirection: direction,
    lastUpdatedTimestamp: timestamp
  };
}

function currentWindStations(stations: Station[]): WindStation[] {
  const windStations: WindStation[] = [];
  for (const station of stations) {
    let speed = station.currentAverage ?? station.currentGust;
    if (
      station.type === 'cwu' &&
      speed === 0 &&
      station.currentGust != null &&
      station.currentGust > 5
    ) {
      speed = station.currentGust;
    }
    const windStation = toWindStation(station, speed, station.currentBearing, station.lastUpdate);
    if (windStation) windStations.push(windStation);
  }
  return windStations;
}

function historicalWindStations(
  stations: Station[],
  values: HistoricalStationData[],
  time: Date
): WindStation[] {
  const stationsById = new Map(stations.map((station) => [station._id, station]));
  const windStations: WindStation[] = [];
  for (const value of values) {
    const station = stationsById.get(value.id);
    const windStation = station
      ? toWindStation(station, value.windAverage ?? value.windGust, value.windBearing, time)
      : null;
    if (windStation) windStations.push(windStation);
  }
  return windStations;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Unable to encode wind particle texture'));
    }, 'image/png');
  });
}

async function createWindTexture(
  field: WindField,
  bounds: LngLatBounds,
  timestamp: number
): Promise<WindTexture> {
  const canvas = document.createElement('canvas');
  canvas.width = GRID_WIDTH;
  canvas.height = GRID_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to create wind particle texture');
  const speedCanvas = document.createElement('canvas');
  speedCanvas.width = GRID_WIDTH;
  speedCanvas.height = GRID_HEIGHT;
  const speedContext = speedCanvas.getContext('2d');
  if (!speedContext) throw new Error('Unable to create wind speed texture');

  const west = bounds.getWest();
  const east = bounds.getEast();
  const south = bounds.getSouth();
  const north = bounds.getNorth();
  const grid = field.sampleGrid({ west, east, south, north }, GRID_WIDTH, GRID_HEIGHT, timestamp);
  const image = context.createImageData(GRID_WIDTH, GRID_HEIGHT);
  const speedImage = speedContext.createImageData(GRID_WIDTH, GRID_HEIGHT);
  const [minimumVelocity, maximumVelocity] = VELOCITY_RANGE_MPS;
  const velocityRange = maximumVelocity - minimumVelocity;

  for (let row = 0; row < GRID_HEIGHT; row++) {
    const sourceRow = GRID_HEIGHT - row - 1;
    for (let column = 0; column < GRID_WIDTH; column++) {
      const sourceIndex = sourceRow * GRID_WIDTH + column;
      const pixelIndex = (row * GRID_WIDTH + column) * 4;
      const speed = grid.speed[sourceIndex];
      const direction = grid.direction[sourceIndex];
      const confidence = grid.confidence[sourceIndex];

      if (!Number.isFinite(speed) || !Number.isFinite(direction) || confidence < MIN_CONFIDENCE) {
        image.data[pixelIndex] = 0;
        image.data[pixelIndex + 1] = 0;
        image.data[pixelIndex + 2] = 0;
        image.data[pixelIndex + 3] = 255;
        speedImage.data[pixelIndex] = 0;
        speedImage.data[pixelIndex + 1] = 0;
        speedImage.data[pixelIndex + 2] = 255;
        speedImage.data[pixelIndex + 3] = 255;
        continue;
      }

      const travelDirection = ((direction + 180) * Math.PI) / 180;
      const eastVelocity = speed * Math.sin(travelDirection);
      const northVelocity = speed * Math.cos(travelDirection);
      image.data[pixelIndex] = Math.round(
        Math.max(0, Math.min(255, ((eastVelocity - minimumVelocity) / velocityRange) * 255))
      );
      image.data[pixelIndex + 1] = Math.round(
        Math.max(0, Math.min(255, ((northVelocity - minimumVelocity) / velocityRange) * 255))
      );
      image.data[pixelIndex + 2] = 255;
      image.data[pixelIndex + 3] = 255;
      speedImage.data[pixelIndex] = Math.round(
        Math.max(0, Math.min(255, (speed / maximumVelocity) * 255))
      );
      speedImage.data[pixelIndex + 1] = 0;
      speedImage.data[pixelIndex + 2] = 0;
      speedImage.data[pixelIndex + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);
  speedContext.putImageData(speedImage, 0, 0);
  const [velocityBlob, speedBlob] = await Promise.all([
    canvasToBlob(canvas),
    canvasToBlob(speedCanvas)
  ]);
  return {
    velocityUrl: URL.createObjectURL(velocityBlob),
    speedUrl: URL.createObjectURL(speedBlob),
    bounds: [west, north, east, south]
  };
}

function particleColors(): [number, number[]][] {
  return [
    [VELOCITY_RANGE_MPS[0], [255, 255, 255]],
    [VELOCITY_RANGE_MPS[1], [255, 255, 255]]
  ];
}

function speedColors(sport: SportType): [number, number[]][] {
  const colors: [number, number[]][] = [];
  for (let speedMps = 0; speedMps <= VELOCITY_RANGE_MPS[1]; speedMps += 1) {
    const hex = getWindColorForSport(speedMps * 3.6, sport);
    colors.push([
      speedMps,
      [
        Number.parseInt(hex.slice(1, 3), 16),
        Number.parseInt(hex.slice(3, 5), 16),
        Number.parseInt(hex.slice(5, 7), 16)
      ]
    ]);
  }
  return colors;
}

export function useWindFieldOverlay({
  map,
  isMapLoaded,
  isVisible,
  historyOffset,
  sport
}: UseWindFieldOverlayOptions): void {
  const { stations } = useStations();
  const fieldRef = useRef<WindField | null>(null);
  const snapshotTimeRef = useRef(0);
  const refreshRef = useRef<(() => void) | null>(null);
  const particleLayerRef = useRef<ParticleMotion | null>(null);
  const speedLayerRef = useRef<SmoothRaster | null>(null);
  const textureUrlsRef = useRef<string[]>([]);
  const textureRequestRef = useRef(0);
  const snapshotRequestRef = useRef(0);
  const visibilityRef = useRef(isVisible);
  // eslint-disable-next-line react-hooks/refs
  visibilityRef.current = isVisible;

  useEffect(() => {
    if (historyOffset >= 0) {
      const windStations = currentWindStations(stations);
      fieldRef.current = stations.length ? new WindField(windStations) : null;
      snapshotTimeRef.current = Date.now();
      refreshRef.current?.();
      return;
    }

    const requestId = ++snapshotRequestRef.current;
    void loadAllStationDataAtTimestamp(getSnapshotTime(historyOffset))
      .then((snapshot) => {
        if (requestId !== snapshotRequestRef.current) return;
        const snapshotTime = new Date(snapshot.time);
        fieldRef.current = new WindField(
          historicalWindStations(stations, snapshot.values, snapshotTime)
        );
        snapshotTimeRef.current = snapshotTime.getTime();
        refreshRef.current?.();
      })
      .catch(() => {
        if (requestId !== snapshotRequestRef.current) return;
        fieldRef.current = null;
        refreshRef.current?.();
      });
  }, [historyOffset, stations]);

  useEffect(() => {
    const mapInstance = map.current;
    if (!mapInstance || !isMapLoaded) return;

    let disposed = false;

    const removeLayer = () => {
      if (mapInstance.getLayer(PARTICLE_LAYER_ID)) mapInstance.removeLayer(PARTICLE_LAYER_ID);
      if (mapInstance.getLayer(SPEED_LAYER_ID)) mapInstance.removeLayer(SPEED_LAYER_ID);
      particleLayerRef.current = null;
      speedLayerRef.current = null;
    };

    const refresh = () => {
      const field = fieldRef.current;
      const bounds = mapInstance.getBounds();
      if (!field || !bounds || !mapInstance.isStyleLoaded()) {
        if (!field) removeLayer();
        return;
      }

      const textureRequest = ++textureRequestRef.current;
      void createWindTexture(field, bounds, snapshotTimeRef.current)
        .then((texture) => {
          if (disposed || textureRequest !== textureRequestRef.current) {
            URL.revokeObjectURL(texture.velocityUrl);
            URL.revokeObjectURL(texture.speedUrl);
            return;
          }

          removeLayer();
          const speedLayer = new SmoothRaster({
            id: SPEED_LAYER_ID,
            source: texture.speedUrl,
            bounds: texture.bounds,
            color: speedColors(sport),
            scalarValueRange: VELOCITY_RANGE_MPS,
            opacity: 0.6,
            readyForDisplay: true,
            cacheOption: 'no-store'
          });
          speedLayerRef.current = speedLayer;
          mapInstance.addLayer(speedLayer as unknown as Parameters<MapboxMap['addLayer']>[0]);

          const particleLayer = new ParticleMotion({
            id: PARTICLE_LAYER_ID,
            source: texture.velocityUrl,
            bounds: texture.bounds,
            color: particleColors(),
            unit: 'mps',
            velocityRange: VELOCITY_RANGE_MPS,
            particleCount: 1000,
            readyForDisplay: true,
            cacheOption: 'no-store'
          });
          particleLayerRef.current = particleLayer;
          mapInstance.addLayer(particleLayer as unknown as Parameters<MapboxMap['addLayer']>[0]);

          textureUrlsRef.current.push(texture.velocityUrl, texture.speedUrl);
          if (mapInstance.getLayer(PARTICLE_LAYER_ID)) {
            mapInstance.setLayoutProperty(
              PARTICLE_LAYER_ID,
              'visibility',
              visibilityRef.current ? 'visible' : 'none'
            );
          }
          if (mapInstance.getLayer(SPEED_LAYER_ID)) {
            mapInstance.setLayoutProperty(
              SPEED_LAYER_ID,
              'visibility',
              visibilityRef.current ? 'visible' : 'none'
            );
          }
        })
        .catch(() => undefined);
    };

    const onStyleLoad = () => {
      particleLayerRef.current = null;
      speedLayerRef.current = null;
      refresh();
    };
    const onWindowResize = () => {
      mapInstance.resize();
      refresh();
    };
    mapInstance.on('style.load', onStyleLoad);
    mapInstance.on('moveend', refresh);
    mapInstance.on('resize', refresh);
    window.addEventListener('resize', onWindowResize);
    refreshRef.current = refresh;
    refresh();

    return () => {
      disposed = true;
      mapInstance.off('style.load', onStyleLoad);
      mapInstance.off('moveend', refresh);
      mapInstance.off('resize', refresh);
      window.removeEventListener('resize', onWindowResize);
      refreshRef.current = null;
      removeLayer();
      for (const textureUrl of textureUrlsRef.current) URL.revokeObjectURL(textureUrl);
      textureUrlsRef.current = [];
    };
  }, [map, isMapLoaded, sport]);

  useEffect(() => {
    const mapInstance = map.current;
    if (!mapInstance || !isMapLoaded || !mapInstance.getLayer(PARTICLE_LAYER_ID)) return;
    mapInstance.setLayoutProperty(PARTICLE_LAYER_ID, 'visibility', isVisible ? 'visible' : 'none');
    if (mapInstance.getLayer(SPEED_LAYER_ID)) {
      mapInstance.setLayoutProperty(SPEED_LAYER_ID, 'visibility', isVisible ? 'visible' : 'none');
    }
  }, [map, isMapLoaded, isVisible]);
}

export { currentWindStations, historicalWindStations };
