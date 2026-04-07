import { useCallback, useEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import mapboxgl from 'mapbox-gl';
import { LandingMarker } from '@/components/map/LandingMarker';
import { getLandingGeoJson, attachTouchGuard } from '@/components/map';
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
      const isTouching = attachTouchGuard(el);

      el.addEventListener('click', () => {
        popup.remove();
        navigate(`/landings/${dbId}`);
      });
      el.addEventListener('mouseenter', () => {
        if (!isTouching() && map.current) popup.addTo(map.current);
      });
      el.addEventListener('mouseleave', () => {
        if (!isTouching()) popup.remove();
      });

      return { marker: el, popup };
    },
    [navigate, map]
  );

  // Initialize landings
  const initialize = useCallback(() => {
    if (!map.current || landingsLoading || !landings?.length) return;

    // Also try to load real landings from API
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
          new mapboxgl.Marker(marker)
            .setLngLat(f.geometry.coordinates)
            .addTo(map.current);
        }
      }
    } catch (error) {
      console.error('❌ Error loading real landings:', error);
    }

    // Set initial visibility after all markers are created
    for (const item of markersRef.current) {
      item.marker.style.visibility = isVisibleRef.current ? 'visible' : 'hidden';
    }
  }, [map, landings, landingsLoading, createLandingMarker]);

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
    setTransparent
  };
}
