import { useCallback, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

import { listSites } from "@/services/site.service";
import { getSiteGeoJson } from "@/components/map";
import { useNavigate } from "react-router-dom";

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
        offset: [0, 0],
      }).setHTML(`<p align="center"><strong>${name}</strong></p>`);

      const el = document.createElement("div");
      el.id = dbId;
      el.className =
        "site-marker bg-white p-1 rounded-lg cursor-pointer shadow-sm hover:shadow-lg transition-all hover:scale-110";
      el.style.visibility = "hidden";

      // Create SVG flag icon (Lucide Flag icon)
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "20");
      svg.setAttribute("height", "20");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "2");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");
      svg.style.color = "#2563eb"; // blue-600

      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      path.setAttribute(
        "d",
        "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"
      );

      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );
      line.setAttribute("x1", "4");
      line.setAttribute("x2", "4");
      line.setAttribute("y1", "22");
      line.setAttribute("y2", "15");

      svg.appendChild(path);
      svg.appendChild(line);
      el.appendChild(svg);

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
  const initialize = useCallback(async () => {
    if (!map.current) return;

    // Also try to load real sites from API
    try {
      const geoJson = getSiteGeoJson(await listSites());

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
  }, [map, createSiteMarker]);

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
