import { useCallback, useEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';

import { SiteMarker, getSiteGeoJson, escapeHtml, POPUP_OFFSET } from '@/components/map';

import { isWindBearingInRange } from '@/lib/utils';
import { useSites } from '@/hooks';

interface UseSiteMarkersOptions {
  map: React.RefObject<mapboxgl.Map | null>;
  isMapLoaded: boolean;
  isVisible: boolean;
}

export interface UseSiteMarkersResult {
  markers: React.RefObject<{ marker: HTMLDivElement; popup: mapboxgl.Popup }[]>;
  setVisibility: (visible: boolean) => void;
  setWindDirectionFilter: (bearing: number | null) => void;
}

export function useSiteMarkers({
  map,
  isMapLoaded,
  isVisible
}: UseSiteMarkersOptions): UseSiteMarkersResult {
  const navigate = useNavigate();
  const { sites, isLoading: sitesLoading } = useSites();
  const markersRef = useRef<{ marker: HTMLDivElement; popup: mapboxgl.Popup }[]>([]);
  const mapboxMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const isVisibleRef = useRef(isVisible);

  // Keep visibility ref in sync
  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  // Create site marker element with SVG flag icon
  const createSiteMarker = useCallback(
    (
      dbId: string,
      name: string,
      validBearings: string,
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
      el.className = 'z-2 site-marker cursor-pointer';
      el.style.visibility = 'hidden';

      // Render the SiteMarker component to HTML
      el.innerHTML = renderToStaticMarkup(
        <SiteMarker validBearings={validBearings} isOfficial={isOfficial} />
      );

      // Store validBearings for wind filter comparisons
      if (validBearings) el.dataset.validBearings = validBearings;

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
        navigate(`/sites/${dbId}`);
      });

      return { marker: el, popup };
    },
    [navigate, map]
  );

  // Create markers once when site data first arrives.
  // Sites are near-static so we don't support in-place updates; changes require a remount.
  useEffect(() => {
    if (!isMapLoaded || !map.current || sitesLoading || !sites?.length) return;

    // Already created — skip
    if (markersRef.current.length > 0) return;

    try {
      const geoJson = getSiteGeoJson(sites);

      if (geoJson?.features.length) {
        for (const f of geoJson.features) {
          const name = f.properties.name as string;
          const dbId = f.properties.dbId as string;
          const validBearings = f.properties.validBearings as string;
          const isOfficial = f.properties.siteGuideUrl ? true : false;

          const { marker, popup } = createSiteMarker(dbId, name, validBearings, isOfficial);
          popup.setLngLat(f.geometry.coordinates);
          markersRef.current.push({ marker, popup });
          const mbMarker = new mapboxgl.Marker(marker)
            .setLngLat(f.geometry.coordinates)
            .addTo(map.current);
          mapboxMarkersRef.current.push(mbMarker);
        }
      }
    } catch (error) {
      console.error('Error loading sites:', error);
    }

    // Set initial visibility after all markers are created
    for (const item of markersRef.current) {
      item.marker.style.visibility = isVisibleRef.current ? 'visible' : 'hidden';
    }
  }, [isMapLoaded, map, sites, sitesLoading, createSiteMarker]);

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

  // Filter markers by wind bearing; null clears the filter
  const setWindDirectionFilter = useCallback((bearing: number | null) => {
    for (const item of markersRef.current) {
      const validBearings = item.marker.dataset.validBearings;
      const matches = bearing === null || isWindBearingInRange(bearing, validBearings);
      // eslint-disable-next-line react-hooks/immutability
      item.marker.style.opacity = matches ? '1' : '0.1';
    }
  }, []);

  // Update visibility when prop changes
  useEffect(() => {
    setVisibility(isVisible);
  }, [isVisible, setVisibility]);

  return {
    markers: markersRef,
    setVisibility,
    setWindDirectionFilter
  };
}
