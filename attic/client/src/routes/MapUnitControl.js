import './MapControl.css';

export default class MapUnitControl {
  onAdd(map) {
    const unit = document.cookie
      .split('; ')
      .find((row) => row.startsWith('unit='))
      ?.split('=')[1];
    this._map = map;
    this._container = document.createElement('div');
    this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
    this._container.innerHTML = `<button id="unit-icon" class="map-unit-icon" type="button" aria-label="Change unit" aria-disabled="false"><span class="mapboxgl-ctrl-icon" aria-hidden="true" title="Change unit">${unit === 'kt' ? 'kt' : 'km/h'}</span></button>`;
    this._container.addEventListener('click', () => {
      const unit = document.cookie
        .split('; ')
        .find((row) => row.startsWith('unit='))
        ?.split('=')[1];

      if (!unit || unit == 'kmh') {
        this._container.innerHTML = this._container.innerHTML.replace('km/h', 'kt');
        document.cookie = 'unit=kt; samesite=strict; path=/; max-age=31536000; secure';
      } else {
        document.cookie = 'unit=kmh; samesite=strict; path=/; max-age=31536000; secure';
        this._container.innerHTML = this._container.innerHTML.replace('kt', 'km/h');
      }
    });
    return this._container;
  }

  onRemove() {
    this._container.parentNode.removeChild(this._container);
    this._map = undefined;
  }
}
