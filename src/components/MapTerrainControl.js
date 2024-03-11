import './MapTerrainControl.css';

export default class MapTerrainControl {
  onAdd(map) {
    this._map = map;
    this._container = document.createElement('div');
    this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
    this._container.innerHTML = `<button id="layer-icon" class="map-layer-icon" type="button" aria-label="Change basemap" aria-disabled="false"><span class="mapboxgl-ctrl-icon" aria-hidden="true" title="Change basemap"></span></button>`;
    this._container.addEventListener('click', () => {
      this.styleType = !this.styleType;
      if (this.styleType) {
        map.setStyle('mapbox://styles/mapbox/satellite-streets-v11');
      } else {
        map.setStyle('mapbox://styles/mapbox/outdoors-v11');
      }
    });
    return this._container;
  }

  onRemove() {
    this._container.parentNode.removeChild(this._container);
    this._map = undefined;
  }
}
