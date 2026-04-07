import { useCallback, useEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import mapboxgl from 'mapbox-gl';
import { LandingMarker } from '@/components/map/LandingMarker';
import { getLandingGeoJson, attachTouchGuard, type TouchGuard } from '@/components/map';
import { useNavigate } from 'react-router-dom';
import { useLandings } from '../useLandings';

interface UseLandingMarkersOptions {
  map: React.RefObject<mapboxgl.Map | null>;
  isMapLoaded: boolean;
  isVisible: boolean;
}

export function useLandingMarkers({ map, isMapLoaded, isVisible }: UseLandingMarkersOptions) {
  const navigate = useNavigate();
  const { landings, isLoading: landingsLoading } = useLandings();
  const markersRef = useRef<{ marker: HTMLDivElement; popup: mapboxgl.Popup }[]>([]);
  const mapboxMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const touchGuardsRef = useRef<TouchGuard[]>([]);
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
      el.style.zIndex = '1';

      // Render the LandingMarker component to HTML
      el.innerHTML = renderToStaticMarkup(<LandingMarker isOfficial={isOfficial} />);

      // Event handlers
      const touchGuard = attachTouchGuard(el);

      el.addEventListener('click', () => {
        popup.remove();
        navigate(`/landings/${dbId}`);
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

  // Sync markers whenever landing data changes
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

          const { marker, popup, touchGuard } = createLandingMarker(dbId, name, isOfficial);
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
