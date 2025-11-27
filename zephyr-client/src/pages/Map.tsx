import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import "mapbox-gl/dist/mapbox-gl.css";

import { useAppContext } from "@/context/AppContext";
import {
  MapControlButtons,
  ElevationControls,
  getStoredValue,
  setStoredValue,
} from "@/components/map";
import type { WindUnit } from "@/components/map";

import {
  useMapInstance,
  useStationMarkers,
  useWebcamMarkers,
  useSoundingMarkers,
} from "@/hooks/map";
import { toast } from "sonner";

const REFRESH_INTERVAL_SECONDS = 60;

export default function Map() {
  const navigate = useNavigate();
  const { setRefreshedStations, setRefreshedWebcams } = useAppContext();

  // Map container ref
  const mapContainer = useRef<HTMLDivElement>(null);

  // UI state
  const [showWebcams, setShowWebcams] = useState(false);
  const [showSoundings, setShowSoundings] = useState(false);
  const [showElevation, setShowElevation] = useState(false);
  const [elevationFilter, setElevationFilter] = useState(0);
  const [isSatellite, setIsSatellite] = useState(false);

  // Unit state
  const [unit, setUnit] = useState<WindUnit>(() =>
    getStoredValue<WindUnit>("unit", "kmh")
  );

  // Initialize map
  const { map, isLoaded } = useMapInstance({
    containerRef: mapContainer,
  });

  // Initialize station markers
  const { refresh: refreshStations } = useStationMarkers({
    map,
    isMapLoaded: isLoaded,
    unit,
    onRefresh: setRefreshedStations,
    navigate,
  });

  // Initialize webcam markers
  const { refresh: refreshWebcams, setVisibility: setWebcamVisibility } =
    useWebcamMarkers({
      map,
      isMapLoaded: isLoaded,
      isVisible: showWebcams,
      onRefresh: setRefreshedWebcams,
      navigate,
    });

  // Initialize sounding markers
  const { refresh: refreshSoundings, setVisibility: setSoundingVisibility } =
    useSoundingMarkers({
      map,
      isMapLoaded: isLoaded,
      isVisible: showSoundings,
      navigate,
    });

  // Handle webcam toggle
  const handleWebcamClick = useCallback(() => {
    if (showSoundings) {
      setShowSoundings(false);
      setSoundingVisibility(false);
    }

    const newValue = !showWebcams;
    setShowWebcams(newValue);
    setWebcamVisibility(newValue);
    if (newValue) refreshWebcams();
  }, [
    showWebcams,
    showSoundings,
    setWebcamVisibility,
    setSoundingVisibility,
    refreshWebcams,
  ]);

  // Handle sounding toggle
  const handleSoundingClick = useCallback(() => {
    if (showWebcams) {
      setShowWebcams(false);
      setWebcamVisibility(false);
    }

    const newValue = !showSoundings;
    setShowSoundings(newValue);
    setSoundingVisibility(newValue);
    if (newValue) refreshSoundings();
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

  // Auto-refresh interval
  useEffect(() => {
    if (!isLoaded) return;

    const interval = setInterval(async () => {
      try {
        await refreshStations();
        await refreshWebcams();
        await refreshSoundings();
      } catch {
        clearInterval(interval);
      }
    }, REFRESH_INTERVAL_SECONDS * 1000);

    return () => clearInterval(interval);
  }, [isLoaded, refreshStations, refreshWebcams, refreshSoundings]);

  // Refresh on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      refreshStations();
      refreshWebcams();
      refreshSoundings();
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
      <MapControlButtons
        showWebcams={showWebcams}
        showSoundings={showSoundings}
        onWebcamClick={handleWebcamClick}
        onSoundingClick={handleSoundingClick}
        isSatellite={isSatellite}
        onLayerToggle={handleLayerToggle}
        unit={unit}
        onUnitToggle={handleUnitToggle}
      />

      <ElevationControls
        showElevation={showElevation}
        elevationFilter={elevationFilter}
        onToggleElevation={() => setShowElevation(!showElevation)}
        onElevationChange={setElevationFilter}
      />

      <div ref={mapContainer} className="w-full h-full" />
      <Outlet />
    </div>
  );
}
