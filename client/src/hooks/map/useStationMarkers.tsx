/* eslint-disable react-hooks/immutability */

import { useCallback, useEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import mapboxgl from 'mapbox-gl';
import { useQueryClient } from '@tanstack/react-query';

import {
  getStationGeoJson,
  sortStationFeatures,
  convertWindSpeed,
  escapeHtml,
  POPUP_OFFSET
} from '@/components/map';
import { StationMarker } from '@/components/map/StationMarker';
import type {
  StationMarker as IStationMarker,
  SportType,
  WindUnit
} from '@/components/map/map.types';

import { getWindDirectionFromBearing, REFRESH_INTERVAL_MS } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';
import { loadAllStationDataAtTimestamp } from '@/services/station.service';
import { useStations } from '@/hooks';
import type { IHistoricalStationData } from '@/models/station-data.model';
import { ApiError } from '@/services/api-error';

interface UseStationMarkersOptions {
  map: React.RefObject<mapboxgl.Map | null>;
  isMapLoaded: boolean;
  isHistoricData: boolean;
  unit: WindUnit;
  isVisible: boolean;
  mapZoom?: number;
}

interface StationProperties {
  dbId: string;
  name: string;
  elevation: number;
  currentAverage: number | null;
  currentGust: number | null;
  currentBearing: number | null;
  validBearings: string | null;
  isOffline: boolean | null;
  lastUpdate: string | null;
}

interface UseStationMarkersResult {
  markers: React.RefObject<IStationMarker[]>;
  renderHistoricalData: (time: Date) => Promise<void>;
  renderCurrentData: () => Promise<void>;
  setInteractive: (interactive: boolean) => void;
  setVisibility: (visible: boolean) => void;
  error: Error | null;
}

const FRESH_MS = 10 * 60 * 1000; // 10 min — transparency
const STALE_MS = 20 * 60 * 1000; // 20 min — more transparency
const EXPIRED_MS = 60 * 60 * 1000; // 60 min — empty circle

/** Reduced opacity for stale data */
function getMarkerOpacity(lastUpdate: string | null): string {
  if (!lastUpdate) return '1';
  const ageMs = Date.now() - new Date(lastUpdate).getTime();
  return ageMs > FRESH_MS ? (ageMs > STALE_MS ? '0.3' : '0.6') : '1';
}

function isDataExpired(lastUpdate: string | null): boolean {
  if (!lastUpdate) return false;
  return Date.now() - new Date(lastUpdate).getTime() > EXPIRED_MS;
}

/**
 * Extract station properties from GeoJSON feature
 */
const extractStationProperties = (properties: Record<string, unknown>): StationProperties => ({
  dbId: properties.dbId as string,
  name: properties.name as string,
  elevation: properties.elevation as number,
  currentAverage: properties.currentAverage as number | null,
  currentGust: properties.currentGust as number | null,
  currentBearing: properties.currentBearing as number | null,
  validBearings: properties.validBearings as string | null,
  isOffline: properties.isOffline as boolean | null,
  lastUpdate: (properties.lastUpdate as string | null) ?? null
});

/**
 * Generate popup HTML content for a station marker
 */
function createPopupHtml(props: StationProperties, unit: WindUnit): string {
  const { name, isOffline, lastUpdate } = props;
  const expired = isDataExpired(lastUpdate);
  const currentAverage = expired ? null : props.currentAverage;
  const currentGust = expired ? null : props.currentGust;
  const currentBearing = expired ? null : props.currentBearing;

  const header = `<p align="center"><strong>${escapeHtml(name)}</strong></p>`;

  if (isOffline) {
    return header + '<p style="color: #ff4261;" align="center">Offline</p>';
  }

  if (currentAverage == null && currentGust == null) {
    return header + `<p align="center">-</p>`;
  }

  const unitLabel = unit === 'kt' ? 'kt' : 'km/h';
  const direction = currentBearing != null ? getWindDirectionFromBearing(currentBearing) : '';

  let windText = '';
  if (currentAverage != null) {
    windText = String(convertWindSpeed(currentAverage, unit));
    if (currentGust != null) {
      windText += ` - ${convertWindSpeed(currentGust, unit)}`;
    }
  }

  return header + `<p align="center">${windText} ${unitLabel} ${direction}</p>`;
}

/**
 * Create a station marker DOM element
 */
function createMarkerElement(
  props: StationProperties,
  unit: WindUnit,
  sport: SportType,
  onNavigate: (dbId: string) => void,
  onShow: (popup: mapboxgl.Popup) => void,
  onHide: (popup: mapboxgl.Popup) => void,
  popup: mapboxgl.Popup
): { container: HTMLDivElement } {
  const {
    dbId,
    elevation,
    currentAverage,
    currentGust,
    currentBearing,
    validBearings,
    isOffline,
    lastUpdate
  } = props;

  // Arrow icon (div with background image)
  const arrow = document.createElement('div');
  arrow.className = 'marker-arrow';

  // Wind speed marker
  arrow.style.backgroundImage = '';
  arrow.style.transform = '';
  const expired = isDataExpired(lastUpdate);
  arrow.innerHTML = renderToStaticMarkup(
    <StationMarker
      bearing={expired ? undefined : (currentBearing ?? undefined)}
      speed={expired ? undefined : (currentAverage ?? undefined)}
      gust={expired ? undefined : (currentGust ?? undefined)}
      validBearings={validBearings ?? undefined}
      isOffline={isOffline ?? undefined}
      unit={unit}
      sport={sport}
    />
  );

  // Container
  const container = document.createElement('div');
  container.id = dbId;
  container.className = 'marker';
  container.dataset.elevation = String(elevation);

  container.dataset.avg = currentAverage != null ? String(currentAverage) : '';
  container.dataset.gust = currentGust != null ? String(currentGust) : '';
  container.dataset.name = props.name;
  container.dataset.bearing = currentBearing != null ? String(currentBearing) : '';
  container.dataset.isOffline = String(isOffline ?? false);
  container.dataset.validBearings = validBearings ?? '';
  container.dataset.lastUpdate = lastUpdate ?? '';
  container.dataset.expired = String(isDataExpired(lastUpdate));
  container.style.zIndex = isOffline ? '2' : validBearings ? '4' : '3';
  container.style.opacity = getMarkerOpacity(lastUpdate);
  container.style.pointerEvents = 'none';

  container.appendChild(arrow);

  // --- Event handling ---
  // Listeners go on the arrow, events bubble from the circle
  // Show popups on mouse hover only
  arrow.style.pointerEvents = 'none';

  arrow.addEventListener('pointerover', (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    onShow(popup);
  });
  arrow.addEventListener('pointerout', (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    if (e.relatedTarget && arrow.contains(e.relatedTarget as Node)) return;
    onHide(popup);
  });
  arrow.addEventListener('click', () => {
    onHide(popup);
    onNavigate(dbId);
  });

  return { container };
}

/**
 * Update an existing marker with new data
 */
function updateMarkerElement(
  marker: HTMLDivElement,
  props: StationProperties,
  unit: WindUnit,
  sport: SportType
): void {
  const { currentAverage, currentGust, currentBearing } = props;

  marker.dataset.avg = currentAverage != null ? String(currentAverage) : '';
  marker.dataset.gust = currentGust != null ? String(currentGust) : '';
  marker.dataset.name = props.name;
  marker.dataset.bearing = currentBearing != null ? String(currentBearing) : '';
  marker.dataset.isOffline = String(props.isOffline ?? false);
  marker.dataset.validBearings = props.validBearings ?? '';
  marker.dataset.lastUpdate = props.lastUpdate ?? '';
  marker.dataset.expired = String(isDataExpired(props.lastUpdate));
  marker.style.opacity = getMarkerOpacity(props.lastUpdate);

  const arrow = marker.querySelector<HTMLDivElement>('.marker-arrow');
  if (arrow) {
    const expired = isDataExpired(props.lastUpdate);
    arrow.style.backgroundImage = '';
    arrow.style.transform = '';
    arrow.innerHTML = renderToStaticMarkup(
      <StationMarker
        bearing={expired ? undefined : (currentBearing ?? undefined)}
        speed={expired ? undefined : (currentAverage ?? undefined)}
        gust={expired ? undefined : (currentGust ?? undefined)}
        validBearings={props.validBearings ?? undefined}
        isOffline={props.isOffline ?? undefined}
        unit={unit}
        sport={sport}
      />
    );
  }
}

const GUST_LABEL_MIN_ZOOM = 10;

function readPropsFromDataset(marker: HTMLDivElement): StationProperties {
  return {
    dbId: marker.id,
    name: marker.dataset.name ?? '',
    elevation: Number(marker.dataset.elevation),
    currentAverage: marker.dataset.avg !== '' ? Number(marker.dataset.avg) : null,
    currentGust: marker.dataset.gust !== '' ? Number(marker.dataset.gust) : null,
    currentBearing: marker.dataset.bearing !== '' ? Number(marker.dataset.bearing) : null,
    validBearings:
      marker.dataset.validBearings !== '' ? (marker.dataset.validBearings ?? null) : null,
    isOffline: marker.dataset.isOffline === 'true',
    lastUpdate: marker.dataset.lastUpdate ?? null
  };
}

export function useStationMarkers({
  map,
  isMapLoaded,
  isHistoricData,
  unit,
  isVisible,
  mapZoom
}: UseStationMarkersOptions): UseStationMarkersResult {
  const isVisibleRef = useRef(isVisible);
  const showGustLabelRef = useRef((mapZoom ?? 0) >= GUST_LABEL_MIN_ZOOM);
  const isHistoricDataRef = useRef(isHistoricData);

  // Keep refs in sync
  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);
  useEffect(() => {
    isHistoricDataRef.current = isHistoricData;
  }, [isHistoricData]);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { sport } = useAppContext();
  const markersRef = useRef<IStationMarker[]>([]);
  const interactiveRef = useRef(true);
  const unitRef = useRef<WindUnit>(unit);
  const sportRef = useRef(sport);

  const { stations, error } = useStations();

  useEffect(() => {
    unitRef.current = unit;
  }, [unit]);

  useEffect(() => {
    sportRef.current = sport;
  }, [sport]);

  // Toggle gust label visibility via CSS class when zoom crosses threshold
  useEffect(() => {
    const hideGust = (mapZoom ?? 0) < GUST_LABEL_MIN_ZOOM;
    showGustLabelRef.current = !hideGust;
    for (const item of markersRef.current) {
      item.marker.classList.toggle('gust-label-hidden', hideGust);
    }
  }, [mapZoom]);

  // Create a station marker with popup
  const createStationMarker = useCallback(
    (props: StationProperties): IStationMarker => {
      const expired = isDataExpired(props.lastUpdate);
      const popupProps: StationProperties = expired
        ? { ...props, currentAverage: null, currentGust: null, currentBearing: null }
        : props;
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: POPUP_OFFSET
      }).setHTML(createPopupHtml(popupProps, unitRef.current));

      const { container } = createMarkerElement(
        props,
        unitRef.current,
        sportRef.current,
        (dbId) => {
          popup.remove();
          void navigate(`/stations/${dbId}`);
        },
        (p) => {
          if (map.current) p.addTo(map.current);
        },
        (p) => p.remove(),
        popup
      );

      if (!showGustLabelRef.current) container.classList.add('gust-label-hidden');

      return { marker: container, popup };
    },
    [navigate, map]
  );

  // Reapply interactive state to a marker's circle after innerHTML replacement
  const applyInteractivity = useCallback((marker: HTMLDivElement) => {
    const circle = marker.querySelector<SVGCircleElement>('.interactive-circle');
    if (circle) circle.style.pointerEvents = interactiveRef.current ? 'auto' : 'none';
  }, []);

  // Wrap updateMarkerElement with post-update hooks (reapply interactivity)
  const refreshMarker = useCallback(
    (marker: HTMLDivElement, props: StationProperties, unit: WindUnit, sport: SportType) => {
      updateMarkerElement(marker, props, unit, sport);
      applyInteractivity(marker);
    },
    [applyInteractivity]
  );

  // Update existing marker
  const updateStationMarker = useCallback(
    (item: IStationMarker, props: StationProperties) => {
      refreshMarker(item.marker, props, unitRef.current, sportRef.current);
      item.popup.setHTML(createPopupHtml(props, unitRef.current));
    },
    [refreshMarker]
  );

  // Track mapbox Marker instances so we can remove them on cleanup
  const mapboxMarkersRef = useRef<mapboxgl.Marker[]>([]);

  // Sync markers whenever station data changes
  useEffect(() => {
    if (!isMapLoaded || !map.current || !stations.length) return;
    // Don't update markers while in history mode
    if (isHistoricDataRef.current) return;

    const geoJson = getStationGeoJson(stations);
    if (!geoJson?.features.length) return;

    if (markersRef.current.length === 0) {
      // Initial creation — sort features for render order
      sortStationFeatures(geoJson.features);

      for (const feature of geoJson.features) {
        const props = extractStationProperties(feature.properties);
        const { marker, popup } = createStationMarker(props);
        popup.setLngLat(feature.geometry.coordinates);
        marker.style.visibility = isVisibleRef.current ? 'visible' : 'hidden';
        markersRef.current.push({ marker, popup });
        const mbMarker = new mapboxgl.Marker(marker)
          .setLngLat(feature.geometry.coordinates)
          .addTo(map.current);
        mapboxMarkersRef.current.push(mbMarker);
      }
    } else {
      // Update existing markers with fresh data
      for (const item of markersRef.current) {
        const feature = geoJson.features.find((f) => f.properties.dbId === item.marker.id);
        if (!feature) continue;
        const props = extractStationProperties(feature.properties);
        updateStationMarker(item, props);
      }
    }
  }, [stations, isMapLoaded, map, createStationMarker, updateStationMarker, isHistoricData]);

  // Cleanup markers only on unmount
  useEffect(() => {
    return () => {
      mapboxMarkersRef.current.forEach((m) => m.remove());
      mapboxMarkersRef.current = [];
      markersRef.current = [];
    };
  }, []);

  // Re-render all markers from their stored dataset values
  const rerenderAllMarkers = useCallback(
    (u: WindUnit, s: SportType) => {
      for (const item of markersRef.current) {
        const props = readPropsFromDataset(item.marker);
        refreshMarker(item.marker, props, u, s);
        item.popup.setHTML(createPopupHtml(props, u));
      }
    },
    [refreshMarker]
  );

  // Update all markers when unit changes
  useEffect(() => {
    rerenderAllMarkers(unit, sportRef.current);
  }, [unit, rerenderAllMarkers]);

  // Update all markers when sport changes
  useEffect(() => {
    rerenderAllMarkers(unitRef.current, sport);
  }, [sport, rerenderAllMarkers]);

  // Cache historical responses by timestamp to avoid refetching when user revisits a time
  const historicalCacheRef = useRef<
    Map<number, { time: string; values: IHistoricalStationData[] }>
  >(new Map());
  const MAX_HISTORICAL_CACHE = 50;

  // Render historical data at a specific timestamp
  const renderHistoricalData = useCallback(
    async (time: Date): Promise<void> => {
      if (!markersRef.current.length) return;

      const key = time.getTime();
      let data = historicalCacheRef.current.get(key);

      if (!data) {
        try {
          data = (await loadAllStationDataAtTimestamp(time)) ?? undefined;
        } catch (error) {
          const msg = error instanceof ApiError ? error.message : 'Unknown error';
          toast.error('Failed to load historical data: ' + msg);
          return;
        }
        if (data) {
          historicalCacheRef.current.set(key, data);
          if (historicalCacheRef.current.size > MAX_HISTORICAL_CACHE) {
            const oldestKey = historicalCacheRef.current.keys().next().value;
            if (oldestKey !== undefined) historicalCacheRef.current.delete(oldestKey);
          }
        }
      }

      if (!data?.values?.length) return;

      // Update each marker with historical data
      for (const item of markersRef.current) {
        const stationData = data.values.find(
          (d: IHistoricalStationData) => d.id === item.marker.id
        );

        // Use data if found, otherwise show empty state
        const windAverage = stationData?.windAverage ?? null;
        const windGust = stationData?.windGust ?? null;
        const windBearing = stationData?.windBearing ?? null;
        const validBearings = stationData?.validBearings ?? null;

        const historicalProps: StationProperties = {
          dbId: item.marker.id,
          name: item.marker.dataset.name ?? '',
          elevation: Number(item.marker.dataset.elevation),
          currentAverage: windAverage,
          currentGust: windGust,
          currentBearing: windBearing,
          validBearings,
          isOffline: false,
          lastUpdate: null // full opacity
        };

        refreshMarker(item.marker, historicalProps, unitRef.current, sportRef.current);
      }
    },
    [refreshMarker]
  );

  // Set marker interactivity (enable/disable click handlers)
  const setInteractive = useCallback(
    (interactive: boolean) => {
      interactiveRef.current = interactive;
      for (const item of markersRef.current) {
        applyInteractivity(item.marker);
        item.marker.style.cursor = interactive ? 'pointer' : 'default';
      }
    },
    [applyInteractivity]
  );

  // Render current (live) data — invalidate to force a fresh fetch
  const renderCurrentData = useCallback(async (): Promise<void> => {
    try {
      await queryClient.refetchQueries({ queryKey: ['stations'] });
    } catch (error) {
      toast.error('Failed to refresh station data: ' + (error as Error).message);
    }
  }, [queryClient]);

  // Check marker staleness periodically against current time and update appearance
  const updateMarkerStaleness = useCallback(() => {
    for (const item of markersRef.current) {
      const props = readPropsFromDataset(item.marker);

      item.marker.style.opacity = getMarkerOpacity(props.lastUpdate);

      const expired = isDataExpired(props.lastUpdate);
      const prevExpired = item.marker.dataset.expired === 'true';
      if (expired === prevExpired) continue;

      refreshMarker(item.marker, props, unitRef.current, sportRef.current);
      item.popup.setHTML(createPopupHtml(props, unitRef.current));
    }
  }, [refreshMarker]);

  useEffect(() => {
    if (!isMapLoaded) return;

    const intervalId = setInterval(() => {
      updateMarkerStaleness();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [isMapLoaded, updateMarkerStaleness]);

  // Toggle visibility
  const setVisibility = useCallback((visible: boolean) => {
    for (const item of markersRef.current) {
      item.marker.style.visibility = visible ? 'visible' : 'hidden';
    }
  }, []);

  // Update visibility when prop changes
  useEffect(() => {
    setVisibility(isVisible);
  }, [isVisible, setVisibility]);

  return {
    markers: markersRef,
    renderHistoricalData,
    renderCurrentData,
    setInteractive,
    setVisibility,
    error
  };
}
