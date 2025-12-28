import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import "mapbox-gl/dist/mapbox-gl.css";
import { History } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";

import { useAppContext } from "@/context/AppContext";
import {
  MapControlButtons,
  getStoredValue,
  setStoredValue,
} from "@/components/map";
import type { WindUnit } from "@/components/map";

import {
  useMapInstance,
  useStationMarkers,
  useWebcamMarkers,
  useSoundingMarkers,
  useSiteMarkers,
} from "@/hooks/map";
import { toast } from "sonner";
import { REFRESH_INTERVAL_MS } from "@/lib/utils";

/**
 * Calculate the snapshot time based on offset (in minutes from current time)
 * Rounds to nearest 30-minute mark
 */
function getSnapshotTime(offset: number): Date {
  const now = new Date();
  const minutesPast30 = now.getMinutes() % 30;
  const roundedTime = new Date(
    now.getTime() -
      (minutesPast30 - offset) * 60 * 1000 -
      now.getSeconds() * 1000 -
      now.getMilliseconds()
  );
  return roundedTime;
}

export default function Map() {
  const { setRefreshedStations, setRefreshedWebcams } = useAppContext();

  // Map container ref
  const mapContainer = useRef<HTMLDivElement>(null);

  // UI state
  const [showWebcams, setShowWebcams] = useState(() =>
    getStoredValue("showWebcams", false)
  );
  const [showSoundings, setShowSoundings] = useState(() =>
    getStoredValue("showSoundings", false)
  );
  const [showSites, setShowSites] = useState(() =>
    getStoredValue("showSites", true)
  );
  const [showElevation, setShowElevation] = useState(false);
  const [elevationFilter, setElevationFilter] = useState(0);
  const [isSatellite, setIsSatellite] = useState(false);

  // History state
  const [historyOffset, setHistoryOffset] = useState(0);

  // Unit state
  const [unit, setUnit] = useState<WindUnit>(() =>
    getStoredValue<WindUnit>("unit", "kmh")
  );

  // Recent stations state
  const [minimizeRecents, setMinimizeRecents] = useState(() =>
    getStoredValue("minimizeRecents", false)
  );

  // Initialize map
  const { map, isLoaded, triggerGeolocate } = useMapInstance({
    containerRef: mapContainer,
  });

  // Initialize station markers
  const {
    refresh: refreshStations,
    renderHistoricalData,
    renderCurrentData,
    setInteractive: setStationMarkersInteractive,
  } = useStationMarkers({
    map,
    isMapLoaded: isLoaded,
    isHistoricData: historyOffset < 0,
    unit,
    onRefresh: setRefreshedStations,
  });

  // Initialize webcam markers
  const { refresh: refreshWebcams, setVisibility: setWebcamVisibility } =
    useWebcamMarkers({
      map,
      isMapLoaded: isLoaded,
      isVisible: showWebcams,
      onRefresh: setRefreshedWebcams,
    });

  // Initialize sounding markers
  const { refresh: refreshSoundings, setVisibility: setSoundingVisibility } =
    useSoundingMarkers({
      map,
      isMapLoaded: isLoaded,
      isVisible: showSoundings,
      isHistoricData: historyOffset < 0,
    });

  // Initialize site markers
  const { setVisibility: setSiteVisibility } = useSiteMarkers({
    map,
    isMapLoaded: isLoaded,
    isVisible: showSites,
  });

  // Handle site toggle
  const handleSitesToggle = useCallback(() => {
    const newValue = !showSites;
    setShowSites(newValue);
    setStoredValue("showSites", newValue);
    setSiteVisibility(newValue);
  }, [showSites, setSiteVisibility]);

  // Handle webcam toggle
  const handleWebcamClick = useCallback(async () => {
    if (showSoundings) {
      setShowSoundings(false);
      setStoredValue("showSoundings", false);
      setSoundingVisibility(false);
    }

    const newValue = !showWebcams;
    setShowWebcams(newValue);
    setStoredValue("showWebcams", newValue);
    setWebcamVisibility(newValue);
    if (newValue) await refreshWebcams();
  }, [
    showWebcams,
    showSoundings,
    setWebcamVisibility,
    setSoundingVisibility,
    refreshWebcams,
  ]);

  // Handle sounding toggle
  const handleSoundingClick = useCallback(async () => {
    if (showWebcams) {
      setShowWebcams(false);
      setStoredValue("showWebcams", false);
      setWebcamVisibility(false);
    }

    const newValue = !showSoundings;
    setShowSoundings(newValue);
    setStoredValue("showSoundings", newValue);
    setSoundingVisibility(newValue);
    if (newValue) await refreshSoundings();
  }, [
    showSoundings,
    showWebcams,
    setSoundingVisibility,
    setWebcamVisibility,
    refreshSoundings,
  ]);

  // Handle layer toggle (outdoors <-> satellite)
  const handleLayerToggle = useCallback(() => {
    if (!map.current) return;
    const newValue = !isSatellite;
    setIsSatellite(newValue);
    map.current.setStyle(
      newValue
        ? "mapbox://styles/mapbox/satellite-streets-v11"
        : "mapbox://styles/mapbox/outdoors-v11"
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSatellite, map.current]);

  // Handle unit toggle
  const handleUnitToggle = useCallback(() => {
    const newUnit = unit === "kmh" ? "kt" : "kmh";
    setUnit(newUnit);
    setStoredValue("unit", newUnit);
    toast.info(`Switched to ${newUnit === "kmh" ? "km/h" : "knots"}`);
  }, [unit]);

  // Handle history offset change
  const handleHistoryChange = useCallback(
    async (offset: number) => {
      const enteringHistoryMode = offset < 0 && historyOffset === 0;
      const exitingHistoryMode = offset === 0 && historyOffset < 0;

      if (enteringHistoryMode) {
        setShowWebcams(false);
        setWebcamVisibility(false);
        setShowSoundings(false);
        setSoundingVisibility(false);
        setStationMarkersInteractive(false);
      } else if (exitingHistoryMode) {
        setStationMarkersInteractive(true);
      }

      setHistoryOffset(offset);

      if (offset < 0) {
        await renderHistoricalData?.(getSnapshotTime(offset));
      } else {
        await renderCurrentData?.();
      }
    },
    [
      historyOffset,
      setWebcamVisibility,
      setSoundingVisibility,
      setStationMarkersInteractive,
      renderHistoricalData,
      renderCurrentData,
    ]
  );

  // Handle recent stations toggle
  const handleRecentsToggle = useCallback(() => {
    const newValue = !minimizeRecents;
    setMinimizeRecents(newValue);
    setStoredValue("minimizeRecents", newValue);
  }, [minimizeRecents]);

  // Check if in history mode
  const isHistoricData = historyOffset < 0;

  // Auto-refresh interval (disabled when in history mode)
  useEffect(() => {
    if (!isLoaded || isHistoricData) return;

    const interval = setInterval(async () => {
      try {
        await refreshStations();
        await refreshWebcams();
        await refreshSoundings();
      } catch {
        clearInterval(interval);
      }
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [
    isLoaded,
    isHistoricData,
    refreshStations,
    refreshWebcams,
    refreshSoundings,
  ]);

  // Refresh on visibility change
  useEffect(() => {
    const handleVisibilityChange = async () => {
      await refreshStations();
      await refreshWebcams();
      await refreshSoundings();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [refreshStations, refreshWebcams, refreshSoundings]);

  // Show/hide elevation borders
  useEffect(() => {
    const borders = document.querySelectorAll("svg.marker-border");
    borders.forEach((b) => {
      b.classList.toggle("hidden", !showElevation);
    });
  }, [showElevation]);

  // Filter by elevation
  useEffect(() => {
    const markers = document.querySelectorAll("div.marker");
    markers.forEach((m) => {
      const elevation = Number(m.getAttribute("elevation"));
      m.classList.toggle("hidden", elevation < elevationFilter);
    });
  }, [elevationFilter]);

  return (
    <div className="absolute top-0 left-0 h-dvh w-screen flex flex-col">
      {/* Red border overlay when in history mode */}
      {isHistoricData && (
        <div className="absolute inset-0 border-4 border-red-500 pointer-events-none z-40" />
      )}

      <MapControlButtons
        onWebcamClick={handleWebcamClick}
        showWebcams={showWebcams}
        onSoundingClick={handleSoundingClick}
        showSoundings={showSoundings}
        onLayerToggle={handleLayerToggle}
        onLocateClick={triggerGeolocate}
        unit={unit}
        onUnitToggle={handleUnitToggle}
        historyOffset={historyOffset}
        onHistoryChange={handleHistoryChange}
        isHistoricData={isHistoricData}
        showElevation={showElevation}
        elevationFilter={elevationFilter}
        onToggleElevation={() => setShowElevation(!showElevation)}
        onElevationChange={setElevationFilter}
        minimizeRecents={minimizeRecents}
        onRecentsToggle={handleRecentsToggle}
        onToggleSites={handleSitesToggle}
        showSites={showSites}
      />

      <div ref={mapContainer} className="w-full h-full" />

      {/* History mode indicator */}
      {isHistoricData && (
        <div className="absolute bottom-4 z-50 flex justify-center w-full px-4">
          <div className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg">
            <History className="h-4 w-4" />
            <span className="text-sm font-medium">
              Viewing Historic Data for{" "}
              {formatInTimeZone(
                getSnapshotTime(historyOffset),
                "Pacific/Auckland",
                "dd MMM HH:mm"
              )}
            </span>
          </div>
        </div>
      )}

      <Outlet />
    </div>
  );
}
