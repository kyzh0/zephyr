import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

import { getWindDirectionFromBearing, REFRESH_INTERVAL_MS } from "@/lib/utils";
import {
  getStationById,
  listStations,
  listStationsUpdatedSince,
  loadAllStationDataAtTimestamp,
} from "@/services/station.service";
import type { IStation } from "@/models/station.model";
import type { IHistoricalStationData } from "@/models/station-data.model";
import {
  getStationGeoJson,
  sortStationFeatures,
  convertWindSpeed,
  getArrowStyle,
} from "@/components/map";
import type { StationMarker, WindUnit } from "@/components/map";
import {
  extractStationProperties,
  formatMarkerText,
  getElevationDashArray,
  getElevationRotation,
  type StationProperties,
} from "./station-marker.utils";
import { useNavigate } from "react-router-dom";

interface UseStationMarkersOptions {
  map: React.RefObject<mapboxgl.Map | null>;
  isMapLoaded: boolean;
  unit: WindUnit;
  onRefresh?: (updatedIds: string[]) => void;
}

/**
 * Generate popup HTML content for a station marker
 */
function createPopupHtml(props: StationProperties, unit: WindUnit): string {
  const { name, currentAverage, currentGust, currentBearing, isOffline } =
    props;

  const header = `<p align="center"><strong>${name}</strong></p>`;

  if (isOffline) {
    return header + '<p style="color: #ff4261;" align="center">Offline</p>';
  }

  if (currentAverage == null && currentGust == null) {
    return header + `<p align="center">-</p>`;
  }

  const unitLabel = unit === "kt" ? "kt" : "km/h";
  const direction =
    currentBearing != null ? getWindDirectionFromBearing(currentBearing) : "";

  let windText = "";
  if (currentAverage != null) {
    windText = String(convertWindSpeed(currentAverage, unit));
    if (currentGust != null) {
      windText += ` - ${convertWindSpeed(currentGust, unit)}`;
    }
  }

  return header + `<p align="center">${windText} ${unitLabel} ${direction}</p>`;
}

/**
 * Create the elevation border SVG element
 */
function createElevationBorderSvg(
  elevation: number,
  bearing: number | null
): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute(
    "class",
    "marker-border absolute top-[-2.2px] left-[-3px] z-[4] w-[30px] h-[30px] hidden"
  );
  svg.setAttribute("viewBox", "0 0 120 120");
  svg.setAttribute("transform", `rotate(${getElevationRotation(bearing)})`);

  const circle = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle"
  );
  circle.setAttribute("fill", "none");
  circle.setAttribute("cx", "60");
  circle.setAttribute("cy", "60");
  circle.setAttribute("r", "56");
  circle.setAttribute("stroke", "#ff4261");
  circle.setAttribute("stroke-width", "8");
  circle.setAttribute("stroke-dasharray", getElevationDashArray(elevation));
  svg.appendChild(circle);

  return svg;
}

/**
 * Create a station marker DOM element
 */
function createMarkerElement(
  props: StationProperties,
  timestamp: number,
  unit: WindUnit,
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
  } = props;
  const [img, textColor] = getArrowStyle(
    currentAverage,
    currentBearing,
    validBearings,
    isOffline
  );

  // Arrow icon (div with background image)
  const arrow = document.createElement("div");
  arrow.className = "marker-arrow";
  arrow.style.transform =
    currentBearing != null ? `rotate(${Math.round(currentBearing)}deg)` : "";
  arrow.style.backgroundImage = img;

  // Wind speed text
  const text = document.createElement("span");
  text.className = "marker-text";
  text.style.color = textColor;
  text.textContent = formatMarkerText(
    currentAverage,
    isOffline,
    unit,
    convertWindSpeed
  );

  // Event handlers
  const handleClick = () => {
    popup.remove();
    onNavigate(dbId);
  };
  const handleEnter = () => onHover(popup, true);
  const handleLeave = () => onHover(popup, false);

  for (const el of [arrow, text]) {
    el.addEventListener("click", handleClick);
    el.addEventListener("mouseenter", handleEnter);
    el.addEventListener("mouseleave", handleLeave);
  }

  // Container
  const container = document.createElement("div");
  container.id = dbId;
  container.className = "marker";
  container.setAttribute("elevation", String(elevation));
  container.dataset.timestamp = String(timestamp);
  container.dataset.avg = currentAverage != null ? String(currentAverage) : "";
  container.dataset.gust = currentGust != null ? String(currentGust) : "";

  container.appendChild(arrow);
  container.appendChild(text);
  container.appendChild(createElevationBorderSvg(elevation, currentBearing));

  return container;
}

/**
 * Update an existing marker with new data
 */
function updateMarkerElement(
  marker: HTMLDivElement,
  props: StationProperties,
  timestamp: number,
  unit: WindUnit
): void {
  const {
    currentAverage,
    currentGust,
    currentBearing,
    validBearings,
    isOffline,
  } = props;
  const [img, textColor] = getArrowStyle(
    currentAverage,
    currentBearing,
    validBearings,
    isOffline
  );

  marker.dataset.timestamp = String(timestamp);
  marker.dataset.avg = currentAverage != null ? String(currentAverage) : "";
  marker.dataset.gust = currentGust != null ? String(currentGust) : "";

  for (const child of Array.from(marker.children)) {
    if (child.classList.contains("marker-text")) {
      const el = child as HTMLElement;
      el.style.color = textColor;
      el.textContent = formatMarkerText(
        currentAverage,
        isOffline,
        unit,
        convertWindSpeed
      );
    } else if (child.classList.contains("marker-arrow")) {
      const el = child as HTMLElement;
      el.style.backgroundImage = img;
      el.style.transform =
        currentBearing != null
          ? `rotate(${Math.round(currentBearing)}deg)`
          : "";
    } else if (
      child.tagName === "svg" &&
      (child as SVGElement).classList.contains("marker-border")
    ) {
      child.setAttribute(
        "transform",
        `rotate(${getElevationRotation(currentBearing)})`
      );
    }
  }
}

export function useStationMarkers({
  map,
  isMapLoaded,
  unit,
  onRefresh,
}: UseStationMarkersOptions) {
  const navigate = useNavigate();
  const markersRef = useRef<StationMarker[]>([]);
  const lastRefreshRef = useRef(0);
  const unitRef = useRef<WindUnit>(unit);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    unitRef.current = unit;
  }, [unit]);

  // Create a station marker with popup
  const createStationMarker = useCallback(
    (props: StationProperties, timestamp: number): StationMarker => {
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: [0, -15],
      }).setHTML(createPopupHtml(props, unitRef.current));

      const marker = createMarkerElement(
        props,
        timestamp,
        unitRef.current,
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

      return { marker, popup };
    },
    [navigate, map]
  );

  // Update existing marker
  const updateStationMarker = useCallback(
    (item: StationMarker, props: StationProperties, timestamp: number) => {
      updateMarkerElement(item.marker, props, timestamp, unitRef.current);
      item.popup.setHTML(createPopupHtml(props, unitRef.current));
    },
    []
  );

  // Check for stations that may have been missed
  const checkMissedUpdates = useCallback(async () => {
    const timestamps = [
      ...new Set(
        markersRef.current.map((m) => Number(m.marker.dataset.timestamp))
      ),
    ];
    if (timestamps.length < 2) return null;

    timestamps.sort((a, b) => a - b);
    const [oldest, secondOldest] = timestamps;

    // Only check if there's a significant gap
    if (secondOldest - oldest <= REFRESH_INTERVAL_MS * 1.1) return null;

    const staleMarkers = markersRef.current.filter(
      (m) => Number(m.marker.dataset.timestamp) === oldest
    );

    const stations: IStation[] = [];
    for (const m of staleMarkers) {
      const station = await getStationById(m.marker.id);
      if (station) stations.push(station);
    }

    return getStationGeoJson(stations);
  }, []);

  // Initialize all station markers
  const initialize = useCallback(async () => {
    const geoJson = getStationGeoJson(await listStations(false));
    if (!map.current || !geoJson?.features.length) return;

    const timestamp = Date.now();
    lastRefreshRef.current = timestamp;
    sortStationFeatures(geoJson.features);

    for (const feature of geoJson.features) {
      const props = extractStationProperties(feature.properties);
      const { marker, popup } = createStationMarker(props, timestamp);

      markersRef.current.push({ marker, popup });
      new mapboxgl.Marker(marker)
        .setLngLat(feature.geometry.coordinates)
        .setPopup(popup)
        .addTo(map.current);
    }
  }, [map, createStationMarker]);

  // Refresh updated stations
  const refresh = useCallback(async () => {
    if (document.visibilityState !== "visible" || !markersRef.current.length)
      return;

    let timestamp = Date.now();
    if (timestamp - lastRefreshRef.current < REFRESH_INTERVAL_MS) return;

    lastRefreshRef.current = timestamp;
    setIsRefreshing(true);

    // Find newest marker timestamp
    const newestTimestamp = Math.max(
      ...markersRef.current.map((m) => Number(m.marker.dataset.timestamp))
    );

    // Fetch stations updated since then
    const stations = await listStationsUpdatedSince(
      Math.round(newestTimestamp / 1000)
    );
    let geoJson = getStationGeoJson(stations);

    // Check for missed updates if no new data
    if (!geoJson?.features.length) {
      geoJson = await checkMissedUpdates();
      if (!geoJson) return;

      // Use second-oldest timestamp for missed updates
      const timestamps = [
        ...new Set(
          markersRef.current.map((m) => Number(m.marker.dataset.timestamp))
        ),
      ];
      timestamps.sort((a, b) => a - b);
      if (timestamps.length >= 2) timestamp = timestamps[1];
    }

    const updatedIds: string[] = [];
    for (const item of markersRef.current) {
      const feature = geoJson.features.find(
        (f) => f.properties.dbId === item.marker.id
      );
      if (!feature) continue;

      const props = extractStationProperties(feature.properties);
      updateStationMarker(item, props, timestamp);
      updatedIds.push(item.marker.id);
    }

    setIsRefreshing(false);
    onRefresh?.(updatedIds);
  }, [checkMissedUpdates, updateStationMarker, onRefresh]);

  // Update all markers when unit changes
  useEffect(() => {
    for (const item of markersRef.current) {
      const avg =
        item.marker.dataset.avg === "" ? null : Number(item.marker.dataset.avg);
      const gust =
        item.marker.dataset.gust === ""
          ? null
          : Number(item.marker.dataset.gust);

      // Update text
      for (const child of Array.from(item.marker.children)) {
        if (child.classList.contains("marker-text") && avg != null) {
          child.textContent = String(convertWindSpeed(avg, unit));
        }
      }

      // Update popup
      const unitLabel = unit === "kt" ? "kt" : "km/h";
      let windText = avg != null ? String(convertWindSpeed(avg, unit)) : "";
      if (avg != null && gust != null) {
        windText += ` - ${convertWindSpeed(gust, unit)}`;
      }
      windText += ` ${unitLabel}`;

      const popupContent = item.popup
        .getElement()
        ?.querySelector(".mapboxgl-popup-content");
      if (popupContent) {
        const html = popupContent.innerHTML.replace(
          /(\d+\s-\s\d+\s|\d+\s)(km\/h|kt)/g,
          windText
        );
        item.popup.setHTML(html);
      }
    }
  }, [unit]);

  // Render historical data at a specific timestamp
  const renderHistoricalData = useCallback(
    async (time: Date): Promise<void> => {
      if (!markersRef.current.length) return;

      const data = await loadAllStationDataAtTimestamp(time);
      if (!data?.values?.length) return;

      // Update each marker with historical data
      for (const item of markersRef.current) {
        const stationData = data.values.find(
          (d: IHistoricalStationData) => d.id === item.marker.id
        );

        // Use data if found, otherwise show empty state
        const windAverage = stationData?.windAverage ?? null;
        const windBearing = stationData?.windBearing ?? null;
        const validBearings = stationData?.validBearings ?? null;

        const [img, textColor] = getArrowStyle(
          windAverage,
          windBearing,
          validBearings,
          false // not offline in history mode
        );

        // eslint-disable-next-line react-hooks/immutability
        item.marker.dataset.avg =
          windAverage != null ? String(windAverage) : "";

        for (const child of Array.from(item.marker.children)) {
          if (child.classList.contains("marker-text")) {
            const el = child as HTMLElement;
            el.style.color = textColor;
            el.textContent =
              windAverage != null
                ? String(convertWindSpeed(windAverage, unitRef.current))
                : "-";
          } else if (child.classList.contains("marker-arrow")) {
            const el = child as HTMLElement;
            el.style.backgroundImage = img;
            el.style.transform =
              windBearing != null
                ? `rotate(${Math.round(windBearing)}deg)`
                : "";
          } else if (
            child.tagName === "svg" &&
            (child as SVGElement).classList.contains("marker-border")
          ) {
            child.setAttribute(
              "transform",
              `rotate(${getElevationRotation(windBearing)})`
            );
          }
        }
      }
    },
    []
  );

  // Set marker interactivity (enable/disable click handlers)
  const setInteractive = useCallback((interactive: boolean) => {
    for (const item of markersRef.current) {
      // eslint-disable-next-line react-hooks/immutability
      item.marker.style.pointerEvents = interactive ? "auto" : "none";
      item.marker.style.cursor = interactive ? "pointer" : "default";
    }
  }, []);

  // Render current (live) data
  const renderCurrentData = useCallback(async (): Promise<void> => {
    if (!markersRef.current.length) return;

    const stations = await listStations(false);
    if (!stations?.length) return;

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
      };

      const [img, textColor] = getArrowStyle(
        props.currentAverage,
        props.currentBearing,
        props.validBearings,
        props.isOffline
      );

      // eslint-disable-next-line react-hooks/immutability
      item.marker.dataset.avg =
        props.currentAverage != null ? String(props.currentAverage) : "";
      item.marker.dataset.gust =
        props.currentGust != null ? String(props.currentGust) : "";

      for (const child of Array.from(item.marker.children)) {
        if (child.classList.contains("marker-text")) {
          const el = child as HTMLElement;
          el.style.color = textColor;
          el.textContent = formatMarkerText(
            props.currentAverage,
            props.isOffline,
            unitRef.current,
            convertWindSpeed
          );
        } else if (child.classList.contains("marker-arrow")) {
          const el = child as HTMLElement;
          el.style.backgroundImage = img;
          el.style.transform =
            props.currentBearing != null
              ? `rotate(${Math.round(props.currentBearing)}deg)`
              : "";
        } else if (
          child.tagName === "svg" &&
          (child as SVGElement).classList.contains("marker-border")
        ) {
          child.setAttribute(
            "transform",
            `rotate(${getElevationRotation(props.currentBearing)})`
          );
        }
      }

      // Update popup
      item.popup.setHTML(createPopupHtml(props, unitRef.current));
    }
  }, []);

  // Initialize when map loads
  useEffect(() => {
    if (isMapLoaded) void initialize();
  }, [isMapLoaded, initialize]);

  // Auto-refresh every minute
  useEffect(() => {
    if (!isMapLoaded) return;

    const intervalId = setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [isMapLoaded, refresh]);

  return {
    markers: markersRef,
    refresh,
    renderHistoricalData,
    renderCurrentData,
    setInteractive,
    isRefreshing,
  };
}
