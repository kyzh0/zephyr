import { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
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
  const [sitesGeoJson, setSitesGeoJson] = useState(null);
  const [markers] = useState([]);

  async function getGeoJson() {
    const s = await list('sites');
    const geoJson = {
      type: 'FeatureCollection',
      features: []
    };
    s.forEach((site) => {
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
      // cwu stations sometimes show avg=0 even when gust is high
      if (
        site.type === 'cwu' &&
        site.currentAverage == 0 &&
        site.currentGust - site.currentAverage > 5
      ) {
        feature.properties.currentAverage = site.currentGust;
      }
      geoJson.features.push(feature);
    });
    return geoJson;
  }

  function getArrowStyle(avgWind) {
    let textColor = 'black';
    let img = '';
    if (avgWind < 15) {
      img = `url('/arrow-light-green.png')`;
    } else if (avgWind < 23) {
      img = `url('/arrow-green.png')`;
    } else if (avgWind < 28) {
      img = `url('/arrow-yellow.png')`;
    } else if (avgWind < 33) {
      img = `url('/arrow-orange.png')`;
    } else if (avgWind < 45) {
      img = `url('/arrow-red.png')`;
      textColor = 'white';
    } else if (avgWind < 60) {
      img = `url('/arrow-purple.png')`;
      textColor = 'white';
    } else {
      img = `url('/arrow-black.png')`;
      textColor = 'white';
    }
    return [img, textColor];
  }

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

    // refresh data every 10 min
    map.current.on('load', async () => {
      setSitesGeoJson(await getGeoJson());
      const interval = setInterval(
        async () => {
          try {
            // data updates on every 10th min, but it
            // takes a while to write, so wait a min
            const min = new Date().getMinutes();
            if (min % 10 == 1) {
              // update marker styling
              const json = await getGeoJson();
              for (const marker of markers) {
                const matches = json.features.filter((entry) => {
                  return entry.properties.dbId === marker.id;
                });
                if (matches && matches.length == 1) {
                  const f = matches[0];
                  for (const child of marker.children) {
                    const [img, color] = getArrowStyle(f.properties.currentAverage);
                    if (child.className === 'marker-text') {
                      child.style.color = color;
                      child.innerHTML = f.properties.currentAverage;
                    } else if (child.className === 'marker-arrow') {
                      child.style.backgroundImage = img;
                      child.style.transform = `rotate(${Math.round(f.properties.rotation)}deg)`;
                    }
                  }
                }
              }
            }
          } catch {
            if (interval) {
              clearInterval(interval);
            }
          }
        },
        1 * 60 * 1000
      );
    });

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
    if (!map.current || !sitesGeoJson) return;

    sitesGeoJson.features.forEach((f) => {
      const childArrow = document.createElement('div');
      childArrow.className = 'marker-arrow';
      childArrow.style.transform = `rotate(${Math.round(f.properties.rotation)}deg)`;
      childArrow.addEventListener('click', () => {
        navigate(`/sites/${f.properties.dbId}`);
      });

      const [img, color] = getArrowStyle(f.properties.currentAverage);
      childArrow.style.backgroundImage = img;

      const childText = document.createElement('span');
      childText.className = 'marker-text';
      childText.style.color = color;
      childText.innerHTML = f.properties.currentAverage;
      childText.addEventListener('click', () => {
        navigate(`/sites/${f.properties.dbId}`);
      });

      const el = document.createElement('div');
      el.id = f.properties.dbId;
      el.className = 'marker';
      el.appendChild(childArrow);
      el.appendChild(childText);
      markers.push(el);

      new mapboxgl.Marker(el).setLngLat(f.geometry.coordinates).addTo(map.current);
    });
  }, [map.current, sitesGeoJson]);

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
