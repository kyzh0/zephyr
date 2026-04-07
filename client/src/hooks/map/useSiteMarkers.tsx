import { useCallback, useEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import mapboxgl from 'mapbox-gl';
import { SiteMarker } from '@/components/map/SiteMarker';
import { getSiteGeoJson, attachTouchGuard, type TouchGuard } from '@/components/map';
import { useNavigate } from 'react-router-dom';
import { useSites } from '../useSites';
import { isWindBearingInRange } from '@/lib/utils';

interface UseSiteMarkersOptions {
  map: React.RefObject<mapboxgl.Map | null>;
  isMapLoaded: boolean;
  isVisible: boolean;
}

export function useSiteMarkers({ map, isMapLoaded, isVisible }: UseSiteMarkersOptions) {
  const navigate = useNavigate();
  const { sites, isLoading: sitesLoading } = useSites();
  const markersRef = useRef<{ marker: HTMLDivElement; popup: mapboxgl.Popup }[]>([]);
  const mapboxMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const touchGuardsRef = useRef<TouchGuard[]>([]);
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
    ): { marker: HTMLDivElement; popup: mapboxgl.Popup; touchGuard: TouchGuard } => {
      // Create popup
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: [0, -15]
      }).setHTML(`<p align="center"><strong>${name}</strong></p>`);

      const el = document.createElement('div');
      el.id = dbId;
      el.className = 'site-marker cursor-pointer';
      el.style.visibility = 'hidden';
      el.style.zIndex = '2';

      // Render the SiteMarker component to HTML
      el.innerHTML = renderToStaticMarkup(
        <SiteMarker validBearings={validBearings} isOfficial={isOfficial} />
      );

      // Store validBearings for wind filter comparisons
      if (validBearings) el.dataset.validBearings = validBearings;

      // Event handlers
      const touchGuard = attachTouchGuard(el);

      el.addEventListener('click', () => {
        popup.remove();
        navigate(`/sites/${dbId}`);
      });
      el.addEventListener('mouseenter', () => {
        if (!touchGuard.isTouching() && map.current) popup.addTo(map.current);
      });
      el.addEventListener('mouseleave', () => {
        if (!touchGuard.isTouching()) popup.remove();
      });

      return { marker: el, popup, touchGuard };
    },
    [navigate, map]
  );

  // Sync markers whenever site data changes
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

          const { marker, popup, touchGuard } = createSiteMarker(
            dbId,
            name,
            validBearings,
            isOfficial
          );
          popup.setLngLat(f.geometry.coordinates);
          markersRef.current.push({ marker, popup });
          touchGuardsRef.current.push(touchGuard);
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
      touchGuardsRef.current.forEach((tg) => tg.cleanup());
      touchGuardsRef.current = [];
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
