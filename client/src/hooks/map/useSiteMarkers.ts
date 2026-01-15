import { useCallback, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

import { getSiteGeoJson } from "@/components/map";
import { useNavigate } from "react-router-dom";
import { useSites } from "../useSites";

interface UseSiteMarkersOptions {
  map: React.RefObject<mapboxgl.Map | null>;
  isMapLoaded: boolean;
  isVisible: boolean;
}

export function useSiteMarkers({
  map,
  isMapLoaded,
  isVisible,
}: UseSiteMarkersOptions) {
  const navigate = useNavigate();
  const { sites, isLoading: sitesLoading } = useSites();
  const markersRef = useRef<
    { marker: HTMLDivElement; popup: mapboxgl.Popup }[]
  >([]);
  const isVisibleRef = useRef(isVisible);

  // Keep visibility ref in sync
  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  // Create site marker element with SVG flag icon
  const createSiteMarker = useCallback(
    (
      dbId: string,
      name: string
    ): { marker: HTMLDivElement; popup: mapboxgl.Popup } => {
      // Create popup
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: [0, -15],
      }).setHTML(`<p align="center"><strong>${name}</strong></p>`);

      const el = document.createElement("div");
      el.id = dbId;
      el.className =
        "site-marker bg-white p-1 rounded-full cursor-pointer shadow-sm hover:shadow-lg transition-shadow";
      el.style.visibility = "hidden";
      el.style.zIndex = "1";

      // Create paragliding SVG icon
      const icon = document.createElement("div");
      icon.className = "site-marker-icon";
      el.appendChild(icon);

      // Event handlers
      const handleClick = () => {
        popup.remove();
        navigate(`/sites/${dbId}`);
      };
      const handleEnter = () => {
        if (map.current) popup.addTo(map.current);
      };
      const handleLeave = () => {
        popup.remove();
      };

      el.addEventListener("click", handleClick);
      el.addEventListener("mouseenter", handleEnter);
      el.addEventListener("mouseleave", handleLeave);

      return { marker: el, popup };
    },
    [navigate, map]
  );

  // Initialize sites
  const initialize = useCallback(() => {
    if (!map.current || sitesLoading || !sites?.length) return;

    // Also try to load real sites from API
    try {
      const geoJson = getSiteGeoJson(sites);

      if (geoJson?.features.length) {
        for (const f of geoJson.features) {
          const name = f.properties.name as string;
          const dbId = f.properties.dbId as string;

          const { marker, popup } = createSiteMarker(dbId, name);
          markersRef.current.push({ marker, popup });
          new mapboxgl.Marker(marker)
            .setLngLat(f.geometry.coordinates)
            .setPopup(popup)
            .addTo(map.current);
        }
      }
    } catch (error) {
      console.error("❌ Error loading real sites:", error);
    }

    // Set initial visibility after all markers are created
    for (const item of markersRef.current) {
      item.marker.style.visibility = isVisibleRef.current
        ? "visible"
        : "hidden";
    }
  }, [map, sites, sitesLoading, createSiteMarker]);

  // Toggle visibility
  const setVisibility = useCallback((visible: boolean) => {
    for (const item of markersRef.current) {
      // eslint-disable-next-line react-hooks/immutability
      item.marker.style.visibility = visible ? "visible" : "hidden";
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
  }, [isVisible, setVisibility]);

  return {
    markers: markersRef,
    setVisibility,
  };
}
