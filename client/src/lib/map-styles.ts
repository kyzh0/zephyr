import type { StyleSpecification } from 'mapbox-gl';

import { MAP_LAYERS, type MapLayer } from '@/components/map/map.types';

const LINZ_TILES = `https://tiles-cdn.koordinates.com/services;key=${import.meta.env.VITE_LINZ_API_KEY as string}/tiles/v4`;
const LINZ_ATTRIBUTION = '© LINZ CC BY 4.0';

// Zoom at which the map switches from Topo250 to Topo50
const TOPO50_MIN_ZOOM = 10;

/** LINZ NZ Topo250 (small scale) below TOPO50_MIN_ZOOM, NZ Topo50 (large scale) from it up. */
const LINZ_TOPO_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    topo250: {
      type: 'raster',
      tiles: [`${LINZ_TILES}/layer=52343/EPSG:3857/{z}/{x}/{y}.png`],
      tileSize: 256,
      maxzoom: TOPO50_MIN_ZOOM,
      attribution: LINZ_ATTRIBUTION
    },
    topo50: {
      type: 'raster',
      tiles: [`${LINZ_TILES}/layer=50767/EPSG:3857/{z}/{x}/{y}.png`],
      tileSize: 256,
      maxzoom: 16,
      attribution: LINZ_ATTRIBUTION
    }
  },
  layers: [
    { id: 'topo250', type: 'raster', source: 'topo250', maxzoom: TOPO50_MIN_ZOOM },
    { id: 'topo50', type: 'raster', source: 'topo50', minzoom: TOPO50_MIN_ZOOM }
  ]
};

export const MAP_LAYER_STYLES: Record<MapLayer, StyleSpecification | string> = {
  [MAP_LAYERS.OUTDOORS]: 'mapbox://styles/mapbox/outdoors-v11',
  [MAP_LAYERS.SATELLITE]: 'mapbox://styles/mapbox/satellite-streets-v11',
  [MAP_LAYERS.LINZ]: LINZ_TOPO_STYLE
};

/** Order the layer button cycles through, with the label shown on switch. */
export const MAP_LAYER_CYCLE: { layer: MapLayer; label: string }[] = [
  { layer: MAP_LAYERS.OUTDOORS, label: 'Outdoors' },
  { layer: MAP_LAYERS.SATELLITE, label: 'Satellite' },
  { layer: MAP_LAYERS.LINZ, label: 'LINZ Topo' }
];
