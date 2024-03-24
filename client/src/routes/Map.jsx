import { useContext, useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { getLastUpdatedSite as getLastUpdatedSite, list } from '../firebase';
import { AppContext } from '../context/AppContext';
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
  const { refresh, setRefresh } = useContext(AppContext);

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
          currentAverage: site.currentAverage == null ? null : Math.round(site.currentAverage),
          currentBearing: site.currentBearing,
          validBearings: site.validBearings
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

  function getArrowStyle(avgWind, currentBearing, validBearings) {
    let textColor = 'black';
    let img = '';

    let prefix = '';
    if (currentBearing != null && avgWind != null) {
      // site has bearings, check if within bounds
      if (validBearings) {
        prefix = 'gold-arrow';
        const pairs = validBearings.split(',');
        pairs.forEach((p) => {
          const bearings = p.split('-');
          if (bearings.length == 2) {
            const bearing1 = Number(bearings[0]);
            const bearing2 = Number(bearings[1]);
            if (bearing1 <= bearing2) {
              if (currentBearing >= bearing1 && currentBearing <= bearing2) {
                prefix = 'gold-valid-arrow';
              }
            } else {
              if (currentBearing <= bearing1 || currentBearing >= bearing2) {
                prefix = 'gold-valid-arrow';
              }
            }
          }
        });
      } else {
        // site has no bearings
        prefix = 'arrow';
      }
    } else {
      // wind has no direction or avg is null
      prefix = validBearings ? 'gold-circle' : 'circle';
    }

    if (avgWind == null) {
      img = `url('/${prefix}-white.png')`;
    } else if (avgWind < 5) {
      img = `url('/${prefix}-white.png')`;
    } else if (avgWind < 15) {
      img = `url('/${prefix}-light-green.png')`;
    } else if (avgWind < 23) {
      img = `url('/${prefix}-green.png')`;
    } else if (avgWind < 28) {
      img = `url('/${prefix}-yellow.png')`;
    } else if (avgWind < 33) {
      img = `url('/${prefix}-orange.png')`;
    } else if (avgWind < 45) {
      img = `url('/${prefix}-red.png')`;
      textColor = 'white';
    } else if (avgWind < 60) {
      img = `url('/${prefix}-purple.png')`;
      textColor = 'white';
    } else {
      img = `url('/${prefix}-black.png')`;
      textColor = 'white';
    }
    return [img, textColor];
  }

  // this function does NOT read db unnecessarily, so it may be executed frequently
  async function refreshMarkers() {
    if (document.visibilityState !== 'visible') return;
    if (!markers.length) return;

    // find next 10-minute mark where data should be updated
    const date = new Date(markers[0].dataset.timeStamp * 1000);
    const minsToAdd = 10 - (date.getMinutes() % 10);
    const bufferSec = 30; // buffer to allow data to write to db
    const nextCheck = new Date(
      date.getTime() + 1000 * (minsToAdd * 60 - date.getSeconds() + bufferSec)
    );
    if (new Date() < nextCheck) return;

    // check newest lastUpdated value to see if all stations updated
    const s = await getLastUpdatedSite();
    if (!s) return;
    if (markers[0].dataset.timeStamp < s.lastUpdate.seconds) {
      // update marker styling
      const timestamp = Math.floor(Date.now() / 1000);
      const json = await getGeoJson();
      for (const marker of markers) {
        const matches = json.features.filter((entry) => {
          return entry.properties.dbId === marker.id;
        });
        if (matches && matches.length == 1) {
          marker.dataset.timeStamp = timestamp;
          const f = matches[0];
          for (const child of marker.children) {
            const [img, color] = getArrowStyle(
              f.properties.currentAverage,
              f.properties.currentBearing,
              f.properties.validBearings
            );
            if (child.className === 'marker-text') {
              child.style.color = color;
              child.innerHTML =
                f.properties.currentAverage == null ? '-' : f.properties.currentAverage;
            } else if (child.className === 'marker-arrow') {
              child.style.backgroundImage = img;
              child.style.transform =
                f.properties.currentBearing == null
                  ? ''
                  : `rotate(${Math.round(f.properties.currentBearing)}deg)`;
            }
          }
        }
      }

      // trigger refresh in Site component
      setRefresh(refresh + 1);
    }
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
            await refreshMarkers();
          } catch {
            if (interval) {
              clearInterval(interval);
            }
          }
        },
        10 * 1000 // check every 10s
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

  // initialise markers
  useEffect(() => {
    if (!map.current || !sitesGeoJson) return;

    const timestamp = Math.floor(Date.now() / 1000);
    sitesGeoJson.features.forEach((f) => {
      const childArrow = document.createElement('div');
      childArrow.className = 'marker-arrow';
      childArrow.style.transform =
        f.properties.currentBearing == null
          ? ''
          : `rotate(${Math.round(f.properties.currentBearing)}deg)`;
      childArrow.addEventListener('click', () => {
        navigate(`/sites/${f.properties.dbId}`);
      });

      const [img, color] = getArrowStyle(
        f.properties.currentAverage,
        f.properties.currentBearing,
        f.properties.validBearings
      );
      childArrow.style.backgroundImage = img;

      const childText = document.createElement('span');
      childText.className = 'marker-text';
      childText.style.color = color;
      childText.innerHTML = f.properties.currentAverage == null ? '-' : f.properties.currentAverage;
      childText.addEventListener('click', () => {
        navigate(`/sites/${f.properties.dbId}`);
      });

      const el = document.createElement('div');
      el.id = f.properties.dbId;
      el.className = 'marker';
      el.dataset.timeStamp = timestamp;
      el.appendChild(childArrow);
      el.appendChild(childText);
      markers.push(el);

      new mapboxgl.Marker(el).setLngLat(f.geometry.coordinates).addTo(map.current);
    });
  }, [map.current, sitesGeoJson]);

  // refresh on visibility change
  useEffect(() => {
    document.addEventListener('visibilitychange', refreshMarkers);
    return () => {
      document.removeEventListener('visibilitychange', refreshMarkers);
    };
  }, []);

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
