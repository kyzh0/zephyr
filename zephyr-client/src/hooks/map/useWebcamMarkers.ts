import { useCallback, useEffect, useRef } from "react";
import L from "leaflet";
import { formatInTimeZone } from "date-fns-tz";

import {
  getCamById,
  listCams,
  listCamsUpdatedSince,
} from "@/services/cam.service";
import type { ICam } from "@/models/cam.model";
import { getWebcamGeoJson } from "@/components/map";
import { useNavigate } from "react-router-dom";
import { REFRESH_INTERVAL_MS } from "@/lib/utils";

interface UseWebcamMarkersOptions {
  map: React.RefObject<L.Map | null>;
  isMapLoaded: boolean;
  isVisible: boolean;
  onRefresh?: (updatedIds: string[]) => void;
}

export function useWebcamMarkers({
  map,
  isMapLoaded,
  isVisible,
  onRefresh,
}: UseWebcamMarkersOptions) {
  const navigate = useNavigate();
  const markersRef = useRef<
    { element: HTMLDivElement; leafletMarker: L.Marker }[]
  >([]);
  const lastRefreshRef = useRef(0);
  const isVisibleRef = useRef(isVisible);

  // Keep visibility ref in sync
  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  // Create webcam marker element
  const createWebcamMarker = useCallback(
    (
      dbId: string,
      name: string,
      currentTime: Date,
      currentUrl: string,
      timestamp: number
    ): HTMLDivElement => {
      const isStale = timestamp - currentTime.getTime() > 24 * 60 * 60 * 1000;

      const img = document.createElement("img");
      img.width = 150;
      img.src = isStale
        ? ""
        : `${import.meta.env.VITE_FILE_SERVER_PREFIX}/${currentUrl}`;
      img.className = "webcam-img";

      const text = document.createElement("span");
      text.className =
        "absolute bottom-0 left-0 z-10 w-full h-full font-semibold text-sm text-center flex justify-center items-start";
      text.style.fontFamily = "Arial, Helvetica, sans-serif";
      text.innerHTML = name;

      const timeText = document.createElement("span");
      timeText.className =
        "absolute bottom-0 left-0 z-10 w-full h-full text-sm text-center flex justify-center items-end";
      timeText.style.fontFamily = "Arial, Helvetica, sans-serif";

      if (isStale) {
        timeText.innerHTML = "No images in the last 24h.";
        timeText.style.color = "#ff4261";
      } else {
        timeText.innerHTML = formatInTimeZone(
          currentTime,
          "Pacific/Auckland",
          "dd MMM HH:mm"
        );
      }

      const el = document.createElement("div");
      el.style.backgroundColor = "white";
      el.style.visibility = "hidden";
      el.id = dbId;
      el.className = "webcam py-[18px] px-2 rounded-lg cursor-pointer";
      el.dataset.timestamp = String(timestamp);
      el.addEventListener("click", () => navigate(`/webcams/${dbId}`));
      el.appendChild(text);
      el.appendChild(img);
      el.appendChild(timeText);

      return el;
    },
    [navigate]
  );

  // Check for missed webcam updates
  const checkMissedUpdates = useCallback(async (): Promise<
    ReturnType<typeof getWebcamGeoJson>
  > => {
    const distinctTimestamps = [
      ...new Set(markersRef.current.map((m) => m.element.dataset.timestamp)),
    ];
    if (distinctTimestamps.length < 2) return null;

    const sorted = distinctTimestamps.map(Number).sort((a, b) => a - b);
    const min = sorted[0];
    const secondMin = sorted[1];

    if (secondMin - min <= 1.1 * REFRESH_INTERVAL_MS) return null;

    const cams: ICam[] = [];
    const oldestMarkers = markersRef.current.filter(
      (m) => Number(m.element.dataset.timestamp) === min
    );

    for (const m of oldestMarkers) {
      const cam = await getCamById(m.element.id);
      if (cam) cams.push(cam);
    }

    return getWebcamGeoJson(cams);
  }, []);

  // Initialize webcams
  const initialize = useCallback(async () => {
    const geoJson = getWebcamGeoJson(await listCams());
    if (!map.current || !geoJson?.features.length) return;

    const timestamp = Date.now();
    lastRefreshRef.current = timestamp;

    for (const f of geoJson.features) {
      const name = f.properties.name as string;
      const dbId = f.properties.dbId as string;
      const currentTime = f.properties.currentTime as Date;
      const currentUrl = f.properties.currentUrl as string;

      const el = createWebcamMarker(
        dbId,
        name,
        currentTime,
        currentUrl,
        timestamp
      );

      // Create Leaflet marker with custom divIcon
      const leafletMarker = L.marker(
        [f.geometry.coordinates[1], f.geometry.coordinates[0]],
        {
          icon: L.divIcon({
            html: el,
            className: "leaflet-webcam-icon",
            iconSize: [150, 100],
            iconAnchor: [75, 50],
          }),
        }
      );

      markersRef.current.push({ element: el, leafletMarker });
      leafletMarker.addTo(map.current);
    }
  }, [map, createWebcamMarker]);

  // Refresh webcams
  const refresh = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    if (!isVisibleRef.current) return;
    if (!markersRef.current.length) return;

    let timestamp = Date.now();
    if (timestamp - lastRefreshRef.current < REFRESH_INTERVAL_MS) return;

    lastRefreshRef.current = timestamp;

    const newestMarker = markersRef.current.reduce((prev, current) =>
      Number(prev.element.dataset.timestamp) >
      Number(current.element.dataset.timestamp)
        ? prev
        : current
    );

    const webcams = await listCamsUpdatedSince(
      Math.round(Number(newestMarker.element.dataset.timestamp) / 1000)
    );
    let geoJson = getWebcamGeoJson(webcams);

    if (!geoJson?.features.length) {
      geoJson = await checkMissedUpdates();
      if (geoJson) {
        const distinctTimestamps = [
          ...new Set(
            markersRef.current.map((m) => m.element.dataset.timestamp)
          ),
        ];
        const sorted = distinctTimestamps.map(Number).sort((a, b) => a - b);
        if (sorted.length >= 2) timestamp = sorted[1];
      }
      if (!geoJson) return;
    }

    const updatedIds: string[] = [];
    for (const item of markersRef.current) {
      const match = geoJson.features.find(
        (f) => f.properties.dbId === item.element.id
      );
      if (!match) continue;

      const currentTime = match.properties.currentTime as Date;
      const currentUrl = match.properties.currentUrl as string;
      const isStale = timestamp - currentTime.getTime() > 24 * 60 * 60 * 1000;

      // eslint-disable-next-line react-hooks/immutability
      item.element.dataset.timestamp = String(timestamp);

      for (const child of Array.from(item.element.children)) {
        if ((child as HTMLElement).className === "webcam-img") {
          (child as HTMLImageElement).src = isStale
            ? ""
            : `${import.meta.env.VITE_FILE_SERVER_PREFIX}/${currentUrl}`;
        } else if ((child as HTMLElement).className.includes("items-end")) {
          if (isStale) {
            child.innerHTML = "No images in the last 24h.";
            (child as HTMLElement).style.color = "#ff4261";
          } else {
            child.innerHTML = formatInTimeZone(
              currentTime,
              "Pacific/Auckland",
              "dd MMM HH:mm"
            );
            (child as HTMLElement).style.color = "";
          }
        }
      }

      updatedIds.push(item.element.id);
    }

    onRefresh?.(updatedIds);
  }, [checkMissedUpdates, onRefresh]);

  // Toggle visibility
  const setVisibility = useCallback((visible: boolean) => {
    for (const marker of markersRef.current) {
      // eslint-disable-next-line react-hooks/immutability
      marker.element.style.visibility = visible ? "visible" : "hidden";
    }
  }, []);

  // Initialize when map is loaded
  useEffect(() => {
    if (isMapLoaded) {
      void initialize();
    }
  }, [isMapLoaded, initialize]);

  // Update visibility when prop changes
  useEffect(() => {
    setVisibility(isVisible);
    if (isVisible) {
      void refresh();
    }
  }, [isVisible, setVisibility, refresh]);

  return {
    markers: markersRef,
    refresh,
    setVisibility,
  };
}
