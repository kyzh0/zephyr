import { useCallback, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { getWindDirectionFromBearing, handleError, REFRESH_INTERVAL_MS } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';
import {
  listStations,
  listStationsUpdatedSince,
  loadAllStationDataAtTimestamp
} from '@/services/station.service';
import type { IHistoricalStationData } from '@/models/station-data.model';
import { getStationGeoJson, sortStationFeatures, convertWindSpeed } from '@/components/map';
import { StationMarker } from '@/components/map/StationMarker';
import type {
  StationMarker as IStationMarker,
  SportType,
  WindUnit
} from '@/components/map/map.types';
import { renderToStaticMarkup } from 'react-dom/server';
import { useNavigate } from 'react-router-dom';
import type { IStation } from '@/models/station.model';
import type { RefObject } from 'react';
import { toast } from 'sonner';

interface UseStationMarkersOptions {
  map: RefObject<mapboxgl.Map | null>;
  isMapLoaded: boolean;
  isHistoricData: boolean;
  unit: WindUnit;
  isVisible: boolean;
  mapZoom?: number;
  onRefresh?: (updatedIds: string[]) => void;
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

const STALE_MS = 20 * 60 * 1000; // 20 min — dim the marker
const EXPIRED_MS = 60 * 60 * 1000; // 60 min — render as empty circle

/** Reduced opacity for stale data */
function getMarkerOpacity(lastUpdate: string | null): string {
  if (!lastUpdate) return '1';
  const ageMs = Date.now() - new Date(lastUpdate).getTime();
  return ageMs > STALE_MS ? '0.3' : '1';
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
  const { name, currentAverage, currentGust, currentBearing, isOffline } = props;

  const header = `<p align="center"><strong>${name}</strong></p>`;

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
  timestamp: number,
  unit: WindUnit,
  sport: SportType,
  onNavigate: (dbId: string) => void,
  onHover: (popup: mapboxgl.Popup, show: boolean) => void,
  popup: mapboxgl.Popup
): HTMLDivElement {
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
  const handleClick = () => {
    popup.remove();
    onNavigate(dbId);
  };
  const handleEnter = () => onHover(popup, true);
  const handleLeave = () => onHover(popup, false);

  arrow.addEventListener('click', handleClick);
  arrow.addEventListener('mouseenter', handleEnter);
  arrow.addEventListener('mouseleave', handleLeave);

  // Container
  const container = document.createElement('div');
  container.id = dbId;
  container.className = 'marker';
  container.setAttribute('elevation', String(elevation));
  container.dataset.timestamp = String(timestamp);
  container.dataset.avg = currentAverage != null ? String(currentAverage) : '';
  container.dataset.gust = currentGust != null ? String(currentGust) : '';
  container.dataset.name = props.name;
  container.dataset.bearing = currentBearing != null ? String(currentBearing) : '';
  container.dataset.isOffline = String(isOffline ?? false);
  container.dataset.validBearings = validBearings ?? '';
  container.dataset.lastUpdate = lastUpdate ?? '';
  container.style.zIndex = validBearings ? '4' : isOffline ? '2' : '3'; // valid bearings above normal, offline below
  container.style.opacity = getMarkerOpacity(lastUpdate);

  container.appendChild(arrow);

  return container;
}

/**
 * Update an existing marker with new data
 */
function updateMarkerElement(
  marker: HTMLDivElement,
  props: StationProperties,
  timestamp: number,
  unit: WindUnit,
  sport: SportType
): void {
  const { currentAverage, currentGust, currentBearing } = props;

  marker.dataset.timestamp = String(timestamp);
  marker.dataset.avg = currentAverage != null ? String(currentAverage) : '';
  marker.dataset.gust = currentGust != null ? String(currentGust) : '';
  marker.dataset.name = props.name;
  marker.dataset.bearing = currentBearing != null ? String(currentBearing) : '';
  marker.dataset.isOffline = String(props.isOffline ?? false);
  marker.dataset.validBearings = props.validBearings ?? '';
  marker.dataset.lastUpdate = props.lastUpdate ?? '';
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

export function useStationMarkers({
  map,
  isMapLoaded,
  isHistoricData,
  unit,
  isVisible,
  mapZoom,
  onRefresh
}: UseStationMarkersOptions) {
  const isVisibleRef = useRef(isVisible);
  const showGustLabelRef = useRef((mapZoom ?? 0) >= GUST_LABEL_MIN_ZOOM);

  // Keep visibility ref in sync
  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);
  const navigate = useNavigate();
  const { sport } = useAppContext();
  const markersRef = useRef<IStationMarker[]>([]);
  const lastRefreshRef = useRef(0);
  const unitRef = useRef<WindUnit>(unit);
  const sportRef = useRef(sport);
  const refreshAbortController = useRef<AbortController | null>(null);

  const isRefreshingRef = useRef(false);
  const [stations, setStations] = useState<IStation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

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

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      refreshAbortController.current?.abort();
    };
  }, []);

  // Wrapper for async operations with error handling
  const withErrorHandling = useCallback(
    async <T,>(operation: () => Promise<T>, errorMessage: string): Promise<T | null> => {
      try {
        setError(null);
        return await operation();
      } catch (err) {
        console.error(errorMessage, err);
        setError(handleError(err, errorMessage).message);
        toast.error(handleError(err, errorMessage).message);
        return null;
      }
    },
    []
  );

  // Create a station marker with popup
  const createStationMarker = useCallback(
    (props: StationProperties, timestamp: number): IStationMarker => {
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: [0, -15]
      }).setHTML(createPopupHtml(props, unitRef.current));

      const marker = createMarkerElement(
        props,
        timestamp,
        unitRef.current,
        sportRef.current,
        (dbId) => {
          popup.remove();
          void navigate(`/stations/${dbId}`);
        },
        (p, show) => {
          if (show && map.current) p.addTo(map.current);
          else p.remove();
        },
        popup
      );

      if (!showGustLabelRef.current) marker.classList.add('gust-label-hidden');

      return { marker, popup };
    },
    [navigate, map]
  );

  // Update existing marker
  const updateStationMarker = useCallback(
    (item: IStationMarker, props: StationProperties, timestamp: number) => {
      updateMarkerElement(item.marker, props, timestamp, unitRef.current, sportRef.current);
      item.popup.setHTML(createPopupHtml(props, unitRef.current));
    },
    []
  );

  // Initialize all station markers
  const initialize = useCallback(async () => {
    if (isInitialized || !map.current) return;

    const allStations = await withErrorHandling(
      () => listStations(false),
      'Failed to load stations'
    );

    if (!allStations?.length) {
      setIsInitialized(true);
      return;
    }

    setStations(allStations);
    const geoJson = getStationGeoJson(allStations);
    if (!geoJson?.features.length) {
      setIsInitialized(true);
      return;
    }

    const timestamp = Date.now();
    lastRefreshRef.current = timestamp;
    sortStationFeatures(geoJson.features);

    // Clear existing markers
    markersRef.current = [];

    for (const feature of geoJson.features) {
      const props = extractStationProperties(feature.properties);
      const { marker, popup } = createStationMarker(props, timestamp);

      // Set initial visibility based on isVisible prop
      marker.style.visibility = isVisibleRef.current ? 'visible' : 'hidden';

      markersRef.current.push({ marker, popup });
      new mapboxgl.Marker(marker)
        .setLngLat(feature.geometry.coordinates)
        .setPopup(popup)
        .addTo(map.current);
    }

    setIsInitialized(true);
  }, [map, createStationMarker, withErrorHandling, isInitialized]);

  // Refresh updated stations
  const refresh = useCallback(async () => {
    // We don't update map when showing historical data
    if (isHistoricData) return;

    if (
      document.visibilityState !== 'visible' ||
      !markersRef.current.length ||
      isRefreshingRef.current
    ) {
      return;
    }

    const timestamp = Date.now();
    if (timestamp - lastRefreshRef.current < REFRESH_INTERVAL_MS) return;

    // Cancel any ongoing refresh
    refreshAbortController.current?.abort();
    refreshAbortController.current = new AbortController();

    lastRefreshRef.current = timestamp;
    isRefreshingRef.current = true;

    try {
      // Find newest marker timestamp
      const newestTimestamp =
        stations.length > 0
          ? Math.max(...stations.map((s) => new Date(s.lastUpdate).getTime() || 0))
          : 0;

      // Fetch stations updated since then
      const updatedStations = await withErrorHandling(
        () => listStationsUpdatedSince(Math.round(newestTimestamp / 1000)),
        'Failed to refresh station data'
      );

      if (refreshAbortController.current?.signal.aborted) {
        return;
      }

      if (!updatedStations) {
        return;
      }

      const geoJson = getStationGeoJson(updatedStations);

      if (!geoJson?.features.length) {
        return;
      }

      const updatedIds: string[] = [];
      for (const item of markersRef.current) {
        const feature = geoJson.features.find((f) => f.properties.dbId === item.marker.id);
        if (!feature) continue;

        const props = extractStationProperties(feature.properties);
        updateStationMarker(item, props, timestamp);
        updatedIds.push(item.marker.id);
      }

      onRefresh?.(updatedIds);
    } catch (err) {
      console.error('Failed to refresh station markers', err);
      toast.error(handleError(err, 'Failed to refresh station markers').message);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [stations, onRefresh, updateStationMarker, withErrorHandling, isHistoricData]);

  // Re-render all markers from their stored dataset values
  const refreshAllMarkerElements = useCallback((u: WindUnit, s: SportType) => {
    for (const item of markersRef.current) {
      const avg = item.marker.dataset.avg === '' ? null : Number(item.marker.dataset.avg);
      const gust = item.marker.dataset.gust === '' ? null : Number(item.marker.dataset.gust);
      const bearing =
        item.marker.dataset.bearing === '' ? null : Number(item.marker.dataset.bearing);
      const stationProps: StationProperties = {
        dbId: item.marker.id,
        name: item.marker.dataset.name ?? '',
        elevation: Number(item.marker.getAttribute('elevation')),
        currentAverage: avg,
        currentGust: gust,
        currentBearing: bearing,
        validBearings:
          item.marker.dataset.validBearings !== ''
            ? (item.marker.dataset.validBearings ?? null)
            : null,
        isOffline: item.marker.dataset.isOffline === 'true',
        lastUpdate: item.marker.dataset.lastUpdate ?? null
      };
      updateMarkerElement(
        item.marker,
        stationProps,
        Number(item.marker.dataset.timestamp ?? Date.now()),
        u,
        s
      );
      item.popup.setHTML(createPopupHtml(stationProps, u));
    }
  }, []);

  // Update all markers when unit changes
  useEffect(() => {
    refreshAllMarkerElements(unit, sportRef.current);
  }, [unit, refreshAllMarkerElements]);

  // Update all markers when sport changes
  useEffect(() => {
    refreshAllMarkerElements(unitRef.current, sport);
  }, [sport, refreshAllMarkerElements]);

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
        data =
          (await withErrorHandling(
            () => loadAllStationDataAtTimestamp(time),
            'Failed to load historical data'
          )) ?? undefined;
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
          elevation: Number(item.marker.getAttribute('elevation')),
          currentAverage: windAverage,
          currentGust: windGust,
          currentBearing: windBearing,
          validBearings,
          isOffline: false,
          lastUpdate: null // full opacity
        };

        updateMarkerElement(
          item.marker,
          historicalProps,
          Date.now(),
          unitRef.current,
          sportRef.current
        );
      }
    },
    [withErrorHandling]
  );

  // Set marker interactivity (enable/disable click handlers)
  const setInteractive = useCallback((interactive: boolean) => {
    for (const item of markersRef.current) {
      item.marker.style.pointerEvents = interactive ? 'auto' : 'none';
      item.marker.style.cursor = interactive ? 'pointer' : 'default';
    }
  }, []);

  // Render current (live) data
  const renderCurrentData = useCallback(async (): Promise<void> => {
    if (!markersRef.current.length) return;

    const stations = await withErrorHandling(
      () => listStations(false),
      'Failed to load current station data'
    );
    if (!stations?.length) return;

    setStations(stations);

    for (const item of markersRef.current) {
      const station = stations.find((s) => s._id === item.marker.id);
      if (!station) continue;

      const props: StationProperties = {
        dbId: station._id,
        name: station.name,
        elevation: station.elevation ?? 0,
        currentAverage: station.currentAverage ?? null,
        currentGust: station.currentGust ?? null,
        currentBearing: station.currentBearing ?? null,
        validBearings: station.validBearings ?? null,
        isOffline: station.isOffline ?? false,
        lastUpdate: station.lastUpdate ?? null
      };

      updateMarkerElement(item.marker, props, Date.now(), unitRef.current, sportRef.current);

      // Update popup
      item.popup.setHTML(createPopupHtml(props, unitRef.current));
    }
  }, [withErrorHandling]);

  // Initialize when map loads
  useEffect(() => {
    if (isMapLoaded && !isInitialized) {
      void initialize();
    }
  }, [isMapLoaded, isInitialized, initialize]);

  // Auto-refresh every minute
  useEffect(() => {
    if (!isMapLoaded) return;

    const intervalId = setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [isHistoricData, isMapLoaded, refresh]);

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
    refresh,
    renderHistoricalData,
    renderCurrentData,
    setInteractive,
    setVisibility,
    error,
    isInitialized
  };
}
