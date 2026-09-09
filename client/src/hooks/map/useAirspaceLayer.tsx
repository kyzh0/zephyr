import { useEffect, useRef } from 'react';
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
    if (mapInstance.getLayer(layerId)) {
      mapInstance.setLayoutProperty(layerId, 'visibility', visibility);
    }
  }
}

function isAirspaceProperties(value: unknown): value is AirspaceProperties {
  if (!value || typeof value !== 'object') return false;
  const properties = value as Record<string, unknown>;
  return (
    typeof properties.name === 'string' &&
    typeof properties.airspaceClass === 'string' &&
    ['openAirClass', 'upper', 'lower'].every(
      (key) => typeof properties[key] === 'string' || properties[key] === null
    ) &&
    ['upperFeet', 'lowerFeet'].every(
      (key) => typeof properties[key] === 'number' || properties[key] === null
    )
  );
}

function formatAltitude(feet: number | null, rawValue: string | null): string {
  return feet === null ? (rawValue ?? 'Not specified') : `${feet.toLocaleString()} ft`;
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
        ['Lower', formatAltitude(properties.lowerFeet, properties.lower)],
        ['Upper', formatAltitude(properties.upperFeet, properties.upper)]
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

export function useAirspaceLayer({ map, isMapLoaded, isVisible }: UseAirspaceLayerOptions): void {
  const dataRef = useRef<AirspaceGeoJson | null>(null);
  const isVisibleRef = useRef(isVisible);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const hasPopupListenerRef = useRef(false);

  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  useEffect(() => {
    if (!isMapLoaded || !map.current) return;

    let disposed = false;
    const mapInstance = map.current;

    const addLayers = () => {
      if (disposed || !dataRef.current || !mapInstance.isStyleLoaded()) return;

      if (!mapInstance.getSource(SOURCE_ID)) {
        mapInstance.addSource(SOURCE_ID, {
          type: 'geojson',
          data: dataRef.current
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

      setLayerVisibility(map, isVisibleRef.current);

      if (!hasPopupListenerRef.current) {
        const handleAirspaceClick = (event: MapMouseEvent) => {
          const airspaces = (event.features ?? [])
            .map((feature) => (feature as unknown as { properties?: unknown }).properties)
            .filter(isAirspaceProperties)
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

          popupRef.current?.remove();
          popupRef.current = new mapboxgl.Popup({
            closeButton: true,
            className: 'airspace-popup',
            maxWidth: '70vw'
          })
            .setLngLat(event.lngLat)
            .setDOMContent(createAirspacePopup(airspaces))
            .addTo(mapInstance);
        };

        mapInstance.on('click', FILL_LAYER_ID, handleAirspaceClick);
        mapInstance.on('mouseenter', FILL_LAYER_ID, () => {
          mapInstance.getCanvas().style.cursor = 'pointer';
        });
        mapInstance.on('mouseleave', FILL_LAYER_ID, () => {
          mapInstance.getCanvas().style.cursor = '';
        });
        hasPopupListenerRef.current = true;
      }
    };

    const loadAirspace = async () => {
      try {
        if (!dataRef.current) {
          const response = await fetch('/airspace.geojson');
          if (!response.ok) throw new Error(`Airspace request failed: ${response.status}`);
          dataRef.current = (await response.json()) as AirspaceGeoJson;
        }
        addLayers();
      } catch (error) {
        console.error('Unable to load airspace data', error);
      }
    };

    mapInstance.on('style.load', addLayers);
    void loadAirspace();

    return () => {
      disposed = true;
      mapInstance.off('style.load', addLayers);
      popupRef.current?.remove();
      popupRef.current = null;
      mapInstance.getCanvas().style.cursor = '';
    };
  }, [isMapLoaded, map]);

  useEffect(() => {
    setLayerVisibility(map, isVisible);
  }, [isVisible, map]);
}
