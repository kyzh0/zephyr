import { useEffect, useRef, useState } from 'react';
import { Outlet, useLoaderData, useNavigate } from 'react-router-dom';
import { list } from '../firebase';
import { useCookies } from 'react-cookie';

import { createTheme, ThemeProvider } from '@mui/material';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';

import MapTerrainControl from './MapTerrainControl';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import './Map.css';

export default function Map() {
  let theme = createTheme({
    palette: {
      primary: {
        main: '#1a1a1a'
      },
      contrastThreshold: 4.5,
      tonalOffset: 0.2
    }
  });

  const navigate = useNavigate();
  const sites = useLoaderData();
  const [sitesGeoJson, setSitesGeoJson] = useState(null);

  useEffect(() => {
    if (!sites) return;
    const geoJson = {
      type: 'FeatureCollection',
      features: []
    };
    sites.forEach((site) => {
      const feature = {
        type: 'Feature',
        properties: {
          name: site.name,
          dbId: site.id,
          currentAverage: Math.round(site.currentAverage),
          rotation: site.currentBearing
        },
        geometry: {
          type: 'Point',
          coordinates: [site.coordinates._long, site.coordinates._lat]
        }
      };
      geoJson.features.push(feature);
    });
    setSitesGeoJson(geoJson);
  }, [sites]);

  const map = useRef(null);
  const mapContainer = useRef(null);

  const [posInit, setPosInit] = useState(false);
  const [lon, setLon] = useState(0);
  const [lat, setLat] = useState(0);
  const [zoom, setZoom] = useState(0);

  const cookiesOptions = {
    maxAge: 31536000, // 365 days
    secure: true,
    sameSite: 'strict'
  };
  const [cookies, setCookies] = useCookies();

  // read cookies
  useEffect(() => {
    if (cookies.lon) {
      setLon(cookies.lon);
    } else {
      setCookies('lon', 172.5, cookiesOptions);
    }
    if (cookies.lat) {
      setLat(cookies.lat);
    } else {
      setCookies('lat', -41, cookiesOptions);
    }
    if (cookies.zoom) {
      setZoom(cookies.zoom);
    } else {
      setCookies('zoom', window.innerWidth > 1000 ? 5.1 : 4.3, cookiesOptions);
    }
  }, [cookies]);

  useEffect(() => {
    mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_GL_KEY;

    // map init
    if (map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v11',
      center: [lon, lat],
      zoom: zoom,
      pitchWithRotate: false,
      touchPitch: false
    });

    map.current.dragRotate.disable();
    map.current.touchZoomRotate.disableRotation();

    // map controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        showCompass: false
      }),
      'top-right'
    );
    map.current.addControl(new MapTerrainControl(), 'top-right');
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        }
      })
    );

    // save position cookie
    map.current.on('move', () => {
      const lo = map.current.getCenter().lng.toFixed(4);
      const la = map.current.getCenter().lat.toFixed(4);
      const zo = map.current.getZoom().toFixed(2);
      setCookies('lon', lo, cookiesOptions);
      setCookies('lat', la, cookiesOptions);
      setCookies('zoom', zo, cookiesOptions);
    });
  });

  // fly to saved position after load
  useEffect(() => {
    if (lon == 0 && lat == 0 && zoom == 0) return;
    if (posInit || !map.current) return;
    map.current.flyTo({ center: [lon, lat], zoom: zoom });
    setPosInit(true);
  }, [lon, lat, zoom, map.current]);

  // markers
  useEffect(() => {
    if (!sitesGeoJson || !map.current) return;
    sitesGeoJson.features.forEach((f) => {
      const child = document.createElement('div');
      child.className = 'marker-image';
      child.style.transform = `rotate(${Math.round(f.properties.rotation)}deg)`;
      child.addEventListener('click', () => {
        navigate(`/sites/${f.properties.dbId}`);
      });

      const childSpan = document.createElement('span');
      childSpan.className = 'marker-text';
      childSpan.innerHTML = f.properties.currentAverage;
      childSpan.addEventListener('click', () => {
        navigate(`/sites/${f.properties.dbId}`);
      });

      const el = document.createElement('div');
      el.className = 'marker';
      el.appendChild(child);
      el.appendChild(childSpan);

      new mapboxgl.Marker(el).setLngLat(f.geometry.coordinates).addTo(map.current);
    });
  }, [sitesGeoJson, map.current]);

  return (
    <ThemeProvider theme={theme}>
      <Stack
        direction="column"
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100vh',
          width: '100vw'
        }}
      >
        <IconButton
          color="primary"
          sx={{
            backgroundColor: 'white',
            color: '#333333',
            borderRadius: '4px',
            boxShadow: '0 0 0 2px rgba(0,0,0,.1)',
            position: 'absolute',
            top: 0,
            left: 0,
            m: '10px',
            width: '29px',
            height: '29px',
            zIndex: 5,
            '&:hover': {
              backgroundColor: '#f2f2f2'
            }
          }}
          onClick={() => {
            navigate('/help');
          }}
        >
          <QuestionMarkIcon sx={{ mb: '1px' }} />
        </IconButton>
        <Box
          ref={mapContainer}
          sx={{
            width: '100%',
            height: '100%'
          }}
        />
        <Outlet />
      </Stack>
    </ThemeProvider>
  );
}

export async function loader() {
  return await list('sites');
}
