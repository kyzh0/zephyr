import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import * as turf from '@turf/turf';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import LoadingButton from '@mui/lab/LoadingButton';
import CloseIcon from '@mui/icons-material/Close';
import Slider from '@mui/material/Slider';

import { MobileDatePicker } from '@mui/x-date-pickers/MobileDatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { enGB } from 'date-fns/locale';
import { exportXlsx } from '../services/publicService';
import { parse } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';

const DEFAULT_LON = 172.5;
const DEFAULT_LAT = -42;
const DEFAULT_RADIUS = 50;

function MapView({ onCoordinatesChange, radiusKm }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const markerCoords = useRef(null);
  const radiusRef = useRef(null);
  const circleSourceId = 'circle-radius';

  useEffect(() => {
    if (!mapContainer.current) {
      return;
    }
    mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_GL_KEY;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v11',
      center: [172.5, -41],
      zoom: 4.3
    });

    // circle
    map.current.on('load', () => {
      map.current.addSource(circleSourceId, {
        type: 'geojson',
        data: turf.featureCollection([])
      });
      map.current.addLayer({
        id: circleSourceId,
        type: 'fill',
        source: circleSourceId,
        layout: {},
        paint: {
          'fill-color': '#0074D9',
          'fill-opacity': 0.2
        }
      });

      // default marker and circle
      marker.current = new mapboxgl.Marker()
        .setLngLat([DEFAULT_LON, DEFAULT_LAT])
        .addTo(map.current);
      markerCoords.current = { lng: DEFAULT_LON, lat: DEFAULT_LAT };

      const circle = turf.circle([DEFAULT_LON, DEFAULT_LAT], DEFAULT_RADIUS, {
        units: 'kilometers',
        steps: 64
      });
      map.current.getSource(circleSourceId).setData(circle);
    });

    // place marker
    map.current.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      markerCoords.current = { lng, lat };

      if (marker.current) {
        marker.current.setLngLat([lng, lat]);
      } else {
        marker.current = new mapboxgl.Marker().setLngLat([lng, lat]).addTo(map.current);
      }

      // draw circle
      const r = radiusRef.current ? radiusRef.current : radiusKm;
      if (r > 0) {
        const circle = turf.circle([lng, lat], r, { units: 'kilometers', steps: 64 });
        map.current.getSource(circleSourceId).setData(circle);
      }

      if (onCoordinatesChange) {
        onCoordinatesChange({ lng, lat });
      }
    });

    return () => map.current.remove();
  }, [onCoordinatesChange]);

  // change radius
  useEffect(() => {
    if (!map.current || !markerCoords.current) {
      return;
    }

    const { lng, lat } = markerCoords.current;
    if (radiusKm > 0) {
      radiusRef.current = radiusKm;
      const circle = turf.circle([lng, lat], radiusKm, { units: 'kilometers', steps: 64 });
      map.current.getSource(circleSourceId).setData(circle);
    }
  }, [radiusKm]);

  return <Box ref={mapContainer} sx={{ width: '100%', height: '50vh', marginBottom: 0 }} />;
}

MapView.propTypes = {
  onCoordinatesChange: PropTypes.func,
  radiusKm: PropTypes.number
};

export default function ExportXlsx() {
  const navigate = useNavigate();
  function handleClose() {
    navigate('/');
  }

  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const [dateTo, setDateTo] = useState(new Date());
  const [coords, setCoords] = useState({ lng: DEFAULT_LON, lat: DEFAULT_LAT });
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  async function handleSubmit(e) {
    if (loading) {
      return;
    }

    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const data = new FormData(e.currentTarget);
    const key = data.get('api_key').trim();

    // always interpret dates as NZT
    const dFrom = zonedTimeToUtc(
      parse(dateFrom.toLocaleDateString(), 'dd/MM/yyyy', new Date()),
      'Pacific/Auckland'
    );
    const dTo = zonedTimeToUtc(
      parse(dateTo.toLocaleDateString(), 'dd/MM/yyyy', new Date()),
      'Pacific/Auckland'
    );
    const unixFrom = Math.floor(dFrom.getTime() / 1000);
    const unixTo = Math.floor(dTo.getTime() / 1000) + 24 * 60 * 60 - 1; // 23:59:59

    // input validation
    if (!key) {
      setErrorMsg('API key is required');
      setLoading(false);
      return;
    }
    if (unixFrom > unixTo) {
      setErrorMsg('Date From must come before Date To');
      setLoading(false);
      return;
    } else if (unixTo - unixFrom > 180 * 24 * 60 * 60) {
      setErrorMsg('Maximum 180 days data');
      setLoading(false);
      return;
    }

    try {
      const url = await exportXlsx(key, unixFrom, unixTo, coords.lat, coords.lng, radius);
      setLoading(false);
      if (url === 'INVALID KEY') {
        setErrorMsg('Invalid API key');
        return;
      }
      if (!url) {
        setErrorMsg('Something went wrong');
        return;
      }

      // trigger download
      const a = document.createElement('a');
      a.download = 'zephyr-export';
      a.href = url;
      a.target = '_blank';
      a.click();
    } catch (error) {
      setLoading(false);
      console.error(error);
    }
  }

  return (
    <Modal open onClose={handleClose} disableAutoFocus={true}>
      <Container component="main" maxWidth="xs" sx={{ height: '100%' }}>
        <Stack direction="column" justifyContent="center" sx={{ height: '100%' }}>
          <Stack
            direction="column"
            alignItems="center"
            sx={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px'
            }}
          >
            <Stack direction="row" justifyContent="end" sx={{ width: '100%' }}>
              <IconButton sx={{ p: 0 }} onClick={handleClose}>
                <CloseIcon />
              </IconButton>
            </Stack>
            <MapView onCoordinatesChange={setCoords} radiusKm={radius} />
            <Stack direction="row" justifyContent="end" sx={{ width: '100%', fontSize: '10px' }}>
              Radius {radius}km
            </Stack>
            <Slider
              size="small"
              step={10}
              min={10}
              max={100}
              value={radius}
              onChange={(event, value) => setRadius(value)}
            />
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
                <Stack direction="row" sx={{ marginBottom: '4px' }}>
                  <Stack direction="column" sx={{ marginRight: '4px' }}>
                    <Typography sx={{ fontSize: '12px' }}>Date From</Typography>
                    <MobileDatePicker
                      value={dateFrom}
                      onChange={setDateFrom}
                      slotProps={{ textField: { size: 'small' } }}
                    />
                  </Stack>
                  <Stack direction="column" alignItems="end">
                    <Typography sx={{ fontSize: '12px' }}>Date To</Typography>
                    <MobileDatePicker
                      value={dateTo}
                      onChange={setDateTo}
                      slotProps={{ textField: { size: 'small' } }}
                    />
                  </Stack>
                </Stack>
              </LocalizationProvider>
              <TextField
                margin="none"
                fullWidth
                id="api_key"
                label="API Key"
                name="api_key"
                size="small"
              />
              <LoadingButton
                loading={loading}
                type="submit"
                fullWidth
                variant="contained"
                sx={{
                  marginTop: '4px',
                  marginBottom: 0,
                  height: '50px',
                  boxShadow: 'none'
                }}
              >
                Export
              </LoadingButton>
              {errorMsg && (
                <Typography variant="subtitle2" sx={{ color: 'red' }}>
                  {errorMsg}
                </Typography>
              )}
            </Box>
          </Stack>
        </Stack>
      </Container>
    </Modal>
  );
}
