import { useCallback, useEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';

import { LandingMarker, getLandingGeoJson, escapeHtml, POPUP_OFFSET } from '@/components/map';

import { useLandings } from '@/hooks';

interface UseLandingMarkersOptions {
  map: React.RefObject<mapboxgl.Map | null>;
  isMapLoaded: boolean;
  isVisible: boolean;
}

export interface UseLandingMarkersResult {
  markers: React.RefObject<{ marker: HTMLDivElement; popup: mapboxgl.Popup }[]>;
  setVisibility: (visible: boolean) => void;
  setTransparent: (transparent: boolean) => void;
}

export function useLandingMarkers({
  map,
  isMapLoaded,
  isVisible
}: UseLandingMarkersOptions): UseLandingMarkersResult {
  const navigate = useNavigate();
  const { landings, isLoading: landingsLoading } = useLandings();
  const markersRef = useRef<{ marker: HTMLDivElement; popup: mapboxgl.Popup }[]>([]);
  const mapboxMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const isVisibleRef = useRef(isVisible);

  // Keep visibility ref in sync
  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  // Create landing marker element with SVG flag icon
  const createLandingMarker = useCallback(
    (
      dbId: string,
      name: string,
      isOfficial: boolean
    ): { marker: HTMLDivElement; popup: mapboxgl.Popup } => {
      // Create popup
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: POPUP_OFFSET
      }).setHTML(`<p align="center"><strong>${escapeHtml(name)}</strong></p>`);

      const el = document.createElement('div');
      el.id = dbId;
      el.className = 'z-1 site-marker cursor-pointer';
      el.style.visibility = 'hidden';

      // Render the LandingMarker component to HTML
      el.innerHTML = renderToStaticMarkup(<LandingMarker isOfficial={isOfficial} />);

      // Event handlers — popups on mouse only
      el.addEventListener('pointerenter', (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        if (map.current) popup.addTo(map.current);
      });
      el.addEventListener('pointerleave', (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        popup.remove();
      });
      el.addEventListener('click', () => {
        popup.remove();
        navigate(`/landings/${dbId}`);
      });

      return { marker: el, popup };
    },
    [navigate, map]
  );

  // Create markers once when landing data first arrives.
  // Landings are near-static so we don't support in-place updates; changes require a remount.
  useEffect(() => {
    if (!isMapLoaded || !map.current || landingsLoading || !landings?.length) return;

    // Already created — skip
    if (markersRef.current.length > 0) return;

    try {
      const geoJson = getLandingGeoJson(landings);

      if (geoJson?.features.length) {
        for (const f of geoJson.features) {
          const name = f.properties.name as string;
          const dbId = f.properties.dbId as string;
          const isOfficial = f.properties.siteGuideUrl ? true : false;

          const { marker, popup } = createLandingMarker(dbId, name, isOfficial);
          popup.setLngLat(f.geometry.coordinates);
          markersRef.current.push({ marker, popup });
          const mbMarker = new mapboxgl.Marker(marker)
            .setLngLat(f.geometry.coordinates)
            .addTo(map.current);
          mapboxMarkersRef.current.push(mbMarker);
        }
      }
    } catch (error) {
      console.error('Error loading landings:', error);
    }

    // Set initial visibility after all markers are created
    for (const item of markersRef.current) {
      item.marker.style.visibility = isVisibleRef.current ? 'visible' : 'hidden';
    }
  }, [isMapLoaded, map, landings, landingsLoading, createLandingMarker]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mapboxMarkersRef.current.forEach((m) => m.remove());
      mapboxMarkersRef.current = [];
      markersRef.current = [];
    };
  }, []);

  // Toggle visibility
  const setVisibility = useCallback((visible: boolean) => {
    for (const item of markersRef.current) {
      // eslint-disable-next-line react-hooks/immutability
      item.marker.style.visibility = visible ? 'visible' : 'hidden';
    }
  }, []);

  // Use with wind direction filter
  const setTransparent = useCallback((transparent: boolean) => {
    for (const item of markersRef.current) {
      // eslint-disable-next-line react-hooks/immutability
      item.marker.style.opacity = transparent ? '0.1' : '1';
    }
  }, []);

  // Update visibility when prop changes
  useEffect(() => {
    setVisibility(isVisible);
  }, [isVisible, setVisibility]);

  return {
    markers: markersRef,
    setVisibility,
    setTransparent
  };
}
