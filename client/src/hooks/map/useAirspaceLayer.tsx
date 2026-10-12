import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import mapboxgl, { type Map, type MapMouseEvent } from 'mapbox-gl';

import { AIRSPACE_CLASSES, type AirspaceGeoJson, type AirspaceProperties } from '@/components/map';

const SOURCE_ID = 'airspace';
const FILL_LAYER_ID = 'airspace-fill';
const LINE_LAYER_ID = 'airspace-line';

const AIRSPACE_COLOR_EXPRESSION = [
  'match',
  ['get', 'airspaceClass'],
  AIRSPACE_CLASSES.CFZ,
  '#2563eb',
  AIRSPACE_CLASSES.CTA_C,
  '#7c3aed',
  AIRSPACE_CLASSES.CTA_D,
  '#9333ea',
  AIRSPACE_CLASSES.CTR,
  '#dc2626',
  AIRSPACE_CLASSES.D,
  '#ea580c',
  AIRSPACE_CLASSES.GAA,
  '#16a34a',
  AIRSPACE_CLASSES.GAA_TEMPORARY,
  '#65a30d',
  AIRSPACE_CLASSES.MBZ,
  '#0891b2',
  AIRSPACE_CLASSES.MOA,
  '#0f766e',
  AIRSPACE_CLASSES.R,
  '#b91c1c',
  AIRSPACE_CLASSES.R_TEMPORARY,
  '#f97316',
  AIRSPACE_CLASSES.T,
  '#ca8a04',
  AIRSPACE_CLASSES.VHZ,
  '#be185d',
  '#64748b'
] as mapboxgl.Expression;

interface UseAirspaceLayerOptions {
  map: React.RefObject<Map | null>;
  isMapLoaded: boolean;
  isVisible: boolean;
}

function setLayerVisibility(map: React.RefObject<Map | null>, visible: boolean): void {
  const mapInstance = map.current;
  if (!mapInstance) return;
  const visibility = visible ? 'visible' : 'none';

  for (const layerId of [FILL_LAYER_ID, LINE_LAYER_ID]) {
    if (
      mapInstance.getLayer(layerId) &&
      mapInstance.getLayoutProperty(layerId, 'visibility') !== visibility
    ) {
      mapInstance.setLayoutProperty(layerId, 'visibility', visibility);
    }
  }
}

function getAirspaceProperties(value: unknown): AirspaceProperties | null {
  if (!value || typeof value !== 'object') return null;
  // Mapbox omits null-valued properties when encoding GeoJSON as vector tiles.
  const properties: Record<string, unknown> = {
    openAirClass: null,
    upper: null,
    lower: null,
    upperFeet: null,
    lowerFeet: null,
    upperDisplay: null,
    lowerDisplay: null,
    ...(value as Record<string, unknown>)
  };
  const valid =
    typeof properties.name === 'string' &&
    typeof properties.airspaceClass === 'string' &&
    ['openAirClass', 'upper', 'lower', 'upperDisplay', 'lowerDisplay'].every(
      (key) => typeof properties[key] === 'string' || properties[key] === null
    ) &&
    ['upperFeet', 'lowerFeet'].every(
      (key) => typeof properties[key] === 'number' || properties[key] === null
    );
  return valid ? (properties as unknown as AirspaceProperties) : null;
}

function createAirspacePopup(airspaces: AirspaceProperties[]): HTMLDivElement {
  const content = document.createElement('div');
  content.className = 'flex w-full flex-col gap-1 text-sm';

  airspaces
    .sort((a, b) => (a.lowerFeet ?? 0) - (b.lowerFeet ?? 0))
    .forEach((properties, index) => {
      if (index > 0) {
        const separator = document.createElement('hr');
        separator.className = 'my-2 border-slate-200';
        content.append(separator);
      }

      const rows = [
        ['Name', properties.name],
        ['Airspace Class', properties.airspaceClass],
        ['Lower', properties.lowerDisplay ?? properties.lower ?? 'Not specified'],
        ['Upper', properties.upperDisplay ?? properties.upper ?? 'Not specified']
      ];

      rows.forEach(([labelText, value]) => {
        const row = document.createElement('div');
        row.className = 'grid grid-cols-[auto_1fr] gap-x-2';

        const label = document.createElement('strong');
        label.textContent = `${labelText}:`;

        const valueElement = document.createElement('span');
        valueElement.textContent = value;

        row.append(label, valueElement);
        content.append(row);
      });
    });

  return content;
}

interface UseAirspaceLayerResult {
  isLoading: boolean;
  error: Error | null;
  retry: () => void;
}

export function useAirspaceLayer({
  map,
  isMapLoaded,
  isVisible
}: UseAirspaceLayerOptions): UseAirspaceLayerResult {
  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ['airspace'],
    queryFn: async ({ signal }): Promise<AirspaceGeoJson> => {
      const response = await fetch('/airspace.geojson', { signal });
      if (!response.ok) throw new Error(`Airspace request failed: ${response.status}`);
      const collection = (await response.json()) as AirspaceGeoJson | null;
      if (collection?.type !== 'FeatureCollection' || !Array.isArray(collection.features)) {
        throw new Error('Invalid airspace data');
      }
      return collection;
    },
    enabled: isMapLoaded && isVisible,
    staleTime: Infinity,
    retry: false
  });

  useEffect(() => {
    if (!isMapLoaded || !map.current || !isVisible || !data) return;

    const mapInstance = map.current;
    let popup: mapboxgl.Popup | null = null;
    let restoring = false;
    let listenersAttached = false;

    const handleAirspaceClick = (event: MapMouseEvent) => {
      const airspaces = (event.features ?? [])
        .map((feature) =>
          getAirspaceProperties((feature as unknown as { properties?: unknown }).properties)
        )
        .filter((properties) => properties !== null)
        .filter(
          (properties, index, all) =>
            all.findIndex(
              (airspace) =>
                airspace.name === properties.name &&
                airspace.airspaceClass === properties.airspaceClass &&
                airspace.upper === properties.upper &&
                airspace.lower === properties.lower
            ) === index
        );
      if (airspaces.length === 0) return;

      popup?.remove();
      popup = new mapboxgl.Popup({
        closeButton: true,
        className: 'airspace-popup',
        maxWidth: '70vw'
      })
        .setLngLat(event.lngLat)
        .setDOMContent(createAirspacePopup(airspaces))
        .addTo(mapInstance);
    };
    const handleMouseEnter = () => {
      mapInstance.getCanvas().style.cursor = 'pointer';
    };
    const handleMouseLeave = () => {
      mapInstance.getCanvas().style.cursor = '';
    };
    const attachLayerListeners = () => {
      if (listenersAttached) return;
      mapInstance.on('click', FILL_LAYER_ID, handleAirspaceClick);
      mapInstance.on('mouseenter', FILL_LAYER_ID, handleMouseEnter);
      mapInstance.on('mouseleave', FILL_LAYER_ID, handleMouseLeave);
      listenersAttached = true;
    };

    const addLayers = (styleJustLoaded = false) => {
      if (restoring) return;
      if (
        mapInstance.getSource(SOURCE_ID) &&
        mapInstance.getLayer(FILL_LAYER_ID) &&
        mapInstance.getLayer(LINE_LAYER_ID)
      ) {
        setLayerVisibility(map, true);
        attachLayerListeners();
        return;
      }
      // style.load allows layer additions before the basemap sources finish loading.
      // For style diffs and initial setup, retry on styledata/idle once loading settles.
      if (!styleJustLoaded && !mapInstance.isStyleLoaded()) return;
      restoring = true;
      try {
        if (!mapInstance.getSource(SOURCE_ID)) {
          mapInstance.addSource(SOURCE_ID, {
            type: 'geojson',
            data
          });
        }

        if (!mapInstance.getLayer(FILL_LAYER_ID)) {
          mapInstance.addLayer({
            id: FILL_LAYER_ID,
            type: 'fill',
            source: SOURCE_ID,
            paint: {
              'fill-color': AIRSPACE_COLOR_EXPRESSION,
              'fill-opacity': 0.1
            }
          });
        }

        if (!mapInstance.getLayer(LINE_LAYER_ID)) {
          mapInstance.addLayer({
            id: LINE_LAYER_ID,
            type: 'line',
            source: SOURCE_ID,
            paint: {
              'line-color': AIRSPACE_COLOR_EXPRESSION,
              'line-width': 1.5,
              'line-opacity': 0.8
            }
          });
        }

        setLayerVisibility(map, true);
        attachLayerListeners();
      } finally {
        restoring = false;
      }
    };
    const handleStyleLoad = () => {
      popup?.remove();
      addLayers(true);
    };
    const handleStyleData = () => addLayers();

    mapInstance.on('style.load', handleStyleLoad);
    mapInstance.on('styledata', handleStyleData);
    mapInstance.on('idle', handleStyleData);
    addLayers();

    return () => {
      if (listenersAttached) {
        mapInstance.off('click', FILL_LAYER_ID, handleAirspaceClick);
        mapInstance.off('mouseenter', FILL_LAYER_ID, handleMouseEnter);
        mapInstance.off('mouseleave', FILL_LAYER_ID, handleMouseLeave);
      }
      mapInstance.off('style.load', handleStyleLoad);
      mapInstance.off('styledata', handleStyleData);
      mapInstance.off('idle', handleStyleData);
      popup?.remove();
      setLayerVisibility(map, false);
      mapInstance.getCanvas().style.cursor = '';
    };
  }, [isMapLoaded, map, isVisible, data]);

  return {
    isLoading: isVisible && (!isMapLoaded || isFetching),
    error,
    retry: () => {
      void refetch();
    }
  };
}
