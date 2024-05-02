import { useContext, useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useCookies } from 'react-cookie';
import { format } from 'date-fns';
import { AppContext } from '../context/AppContext';
import { getWindDirectionFromBearing } from '../helpers/utils';

import { getStationById, listStations, listStationsUpdatedSince } from '../services/stationService';
import { getCamById, listCams, listCamsUpdatedSince } from '../services/camService';

import { createTheme, ThemeProvider } from '@mui/material';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import GridViewIcon from '@mui/icons-material/GridView';

import MapTerrainControl from './MapTerrainControl';
import MapUnitControl from './MapUnitControl';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import './Map.css';

import { APIROOT } from '../constants';

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
  const [cookies, setCookies] = useCookies();
  const [stationMarkers] = useState([]);
  const [webcamMarkers] = useState([]);
  const [showWebcams, setShowWebcams] = useState(false);
  const webcamsHiddenRef = useRef(true);

  const unitRef = useRef('kmh');
  const [posInit, setPosInit] = useState(false);
  const [lon, setLon] = useState(0);
  const [lat, setLat] = useState(0);
  const [zoom, setZoom] = useState(0);

  const cookiesOptions = {
    path: '/',
    maxAge: 31536000, // 365 days
    secure: true,
    sameSite: 'strict'
  };

  // read cookies
  useEffect(() => {
    if (cookies.lon) {
      if (!isNaN(cookies.lon) && cookies.lon >= -180 && cookies.lon <= 180) setLon(cookies.lon);
    } else {
      setCookies('lon', 172.5, cookiesOptions);
    }
    if (cookies.lat) {
      if (!isNaN(cookies.lat) && cookies.lat >= -90 && cookies.lat <= 90) setLat(cookies.lat);
    } else {
      setCookies('lat', -41, cookiesOptions);
    }
    if (cookies.zoom) {
      if (!isNaN(cookies.zoom)) setZoom(cookies.zoom);
    } else {
      setCookies('zoom', window.innerWidth > 1000 ? 5.1 : 4.3, cookiesOptions);
    }

    if (!cookies.visited) {
      navigate('welcome');
    }

    if (cookies.unit) {
      unitRef.current = cookies.unit === 'kt' ? 'kt' : 'kmh';
    }
  }, [cookies]);

  const REFRESH_INTERVAL_SECONDS = 60;
  const { setRefreshedStations, setRefreshedWebcams } = useContext(AppContext);

  function getArrowStyle(avgWind, currentBearing, validBearings, isOffline) {
    let textColor = 'black';
    let img = '';

    if (isOffline) {
      textColor = 'red';
      img = `url('/circle-white.png')`;
      return [img, textColor];
    }

    let prefix = '';
    if (currentBearing != null && avgWind != null) {
      // station has bearings, check if within bounds
      if (validBearings) {
        prefix = 'gold-arrow';
        const pairs = validBearings.split(',');
        for (const p of pairs) {
          const bearings = p.split('-');
          if (bearings.length == 2) {
            const bearing1 = Number(bearings[0]);
            const bearing2 = Number(bearings[1]);
            if (bearing1 <= bearing2) {
              if (currentBearing >= bearing1 && currentBearing <= bearing2) {
                prefix = 'gold-valid-arrow';
                break;
              }
            } else {
              if (currentBearing >= bearing1 || currentBearing <= bearing2) {
                prefix = 'gold-valid-arrow';
                break;
              }
            }
          }
        }
      } else {
        // station has no bearings
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
    } else if (avgWind < 30) {
      img = `url('/${prefix}-yellow.png')`;
    } else if (avgWind < 35) {
      img = `url('/${prefix}-orange.png')`;
    } else if (avgWind < 60) {
      img = `url('/${prefix}-red.png')`;
      textColor = 'white';
    } else if (avgWind < 80) {
      img = `url('/${prefix}-purple.png')`;
      textColor = 'white';
    } else {
      img = `url('/${prefix}-black.png')`;
      textColor = 'white';
    }
    return [img, textColor];
  }

  function getStationGeoJson(stations) {
    if (!stations || !stations.length) return null;

    const geoJson = {
      type: 'FeatureCollection',
      features: []
    };
    for (const station of stations) {
      let avg = station.currentAverage == null ? null : station.currentAverage;
      const gust = station.currentGust == null ? null : station.currentGust;
      if (avg == null && gust != null) {
        avg = gust;
      }

      const feature = {
        type: 'Feature',
        properties: {
          name: station.name,
          dbId: station._id,
          currentAverage: avg,
          currentGust: gust,
          currentBearing:
            station.currentBearing == null ? null : Math.round(station.currentBearing),
          validBearings: station.validBearings,
          isOffline: station.isOffline
        },
        geometry: station.location
      };
      // cwu stations sometimes show avg=0 even when gust is high
      if (station.type === 'cwu' && avg == 0 && gust - avg > 5) {
        feature.properties.currentAverage = gust;
      }
      geoJson.features.push(feature);
    }
    return geoJson;
  }

  function getWebcamGeoJson(webcams) {
    if (!webcams || !webcams.length) return null;

    const geoJson = {
      type: 'FeatureCollection',
      features: []
    };
    for (const cam of webcams) {
      const feature = {
        type: 'Feature',
        properties: {
          name: cam.name,
          dbId: cam._id,
          currentTime: new Date(cam.currentTime),
          currentUrl: cam.currentUrl
        },
        geometry: cam.location
      };
      geoJson.features.push(feature);
    }
    return geoJson;
  }

  const lastStationRefreshRef = useRef(0);
  async function initialiseStations() {
    const geoJson = getStationGeoJson(await listStations());
    if (!map.current || !geoJson || !geoJson.features.length) return;

    const timestamp = Date.now();
    lastStationRefreshRef.current = timestamp;

    geoJson.features.sort((a, b) => {
      // render offline stations on bottom
      if (a.properties.isOffline && !b.properties.isOffline) {
        return -1;
      } else if (!a.properties.isOffline && b.properties.isOffline) {
        return 1;
      }

      // render stations with no data on bottom
      if (a.properties.currentAverage == null && b.properties.currentAverage != null) {
        return -1;
      } else if (a.properties.currentAverage != null && b.properties.currentAverage == null) {
        return 1;
      }

      // render stations with valid bearings on top
      if (!a.properties.validBearings) {
        if (!b.properties.validBearings) {
          return 0;
        } else {
          return -1;
        }
      }
      if (!b.properties.validBearings) {
        if (!a.properties.validBearings) {
          return 0;
        } else {
          return 1;
        }
      }
      return 0;
    });

    for (const f of geoJson.features) {
      const name = f.properties.name;
      const dbId = f.properties.dbId;
      const currentAvg = f.properties.currentAverage;
      const currentGust = f.properties.currentGust;
      const currentBearing = f.properties.currentBearing;
      const validBearings = f.properties.validBearings;
      const isOffline = f.properties.isOffline;

      // popup
      let html = `<p align="center"><strong>${name}</strong></p>`;
      if (isOffline) {
        html += '<p style="color: red;" align="center">Offline</p>';
      } else {
        if (currentAvg == null && currentGust == null) {
          html += `<p align="center">-</p>`;
        } else {
          let temp = '';
          if (currentAvg != null) {
            if (currentGust != null) {
              temp = `${Math.round(unitRef.current === 'kt' ? currentAvg / 1.852 : currentAvg)} - ${Math.round(unitRef.current === 'kt' ? currentGust / 1.852 : currentGust)}`;
            } else {
              temp = `${Math.round(unitRef.current === 'kt' ? currentAvg / 1.852 : currentAvg)}`;
            }
          }
          const unit = unitRef.current === 'kt' ? 'kt' : 'km/h';
          html += `<p align="center">${temp} ${unit} ${currentBearing == null ? '' : getWindDirectionFromBearing(currentBearing)}</p>`;
        }
      }

      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
      }).setHTML(html);

      // arrow icon
      const arrow = document.createElement('div');
      arrow.className = 'marker-arrow';
      arrow.style.transform =
        currentBearing == null ? '' : `rotate(${Math.round(currentBearing)}deg)`;
      arrow.addEventListener('click', () => {
        popup.remove();
        navigate(`/stations/${dbId}`);
      });
      arrow.addEventListener('mouseenter', () => popup.addTo(map.current));
      arrow.addEventListener('mouseleave', () => popup.remove());

      const [img, color] = getArrowStyle(currentAvg, currentBearing, validBearings, isOffline);
      arrow.style.backgroundImage = img;

      // avg wind text
      const text = document.createElement('span');
      text.className = 'marker-text';
      text.style.color = color;
      if (isOffline) {
        text.innerHTML = 'X';
      } else {
        text.innerHTML =
          currentAvg == null
            ? '-'
            : Math.round(unitRef.current === 'kt' ? currentAvg / 1.852 : currentAvg);
      }
      text.addEventListener('click', () => {
        popup.remove();
        navigate(`/stations/${dbId}`);
      });
      text.addEventListener('mouseenter', () => popup.addTo(map.current));
      text.addEventListener('mouseleave', () => popup.remove());

      // parent element
      const el = document.createElement('div');
      el.id = dbId;
      el.className = 'marker';
      el.dataset.timestamp = timestamp;
      el.dataset.avg = currentAvg == null ? '' : currentAvg;
      el.dataset.gust = currentGust == null ? '' : currentGust;
      el.appendChild(arrow);
      el.appendChild(text);

      stationMarkers.push({ marker: el, popup: popup });
      new mapboxgl.Marker(el).setLngLat(f.geometry.coordinates).setPopup(popup).addTo(map.current);
    }
  }

  const lastWebcamRefreshRef = useRef(0);
  async function initialiseWebcams() {
    const geoJson = getWebcamGeoJson(await listCams());
    if (!map.current || !geoJson || !geoJson.features.length) return;

    const timestamp = Date.now();
    lastWebcamRefreshRef.current = timestamp;

    for (const f of geoJson.features) {
      const name = f.properties.name;
      const dbId = f.properties.dbId;
      const currentTime = f.properties.currentTime;
      const currentUrl = f.properties.currentUrl;

      const img = document.createElement('img');
      img.width = 150;
      img.src = `${APIROOT}/${currentUrl}`;
      img.className = 'webcam-img';

      const text = document.createElement('span');
      text.className = 'webcam-text-name';
      text.innerHTML = `${name}`;

      const text1 = document.createElement('span');
      text1.className = 'webcam-text-date';
      text1.innerHTML = format(currentTime, 'dd MMM HH:mm');

      const el = document.createElement('div');
      el.style.backgroundColor = `white`;
      el.style.visibility = 'hidden';
      el.id = dbId;
      el.className = 'webcam';
      el.dataset.timestamp = timestamp;
      el.addEventListener('click', () => {
        navigate(`/webcams/${dbId}`);
      });
      el.appendChild(text);
      if (timestamp - currentTime.getTime() > 24 * 60 * 60 * 1000) {
        // don't display cams that havent updated in last 24h
        img.src = '';
        text1.innerHTML = 'No images in the last 24h.';
        text1.style.color = 'red';
      }
      el.appendChild(img);
      el.appendChild(text1);

      webcamMarkers.push(el);
      new mapboxgl.Marker(el).setLngLat(f.geometry.coordinates).addTo(map.current);
    }
  }

  async function refreshStations() {
    if (document.visibilityState !== 'visible') return;
    if (!stationMarkers.length) return;

    let timestamp = Date.now();
    if (timestamp - lastStationRefreshRef.current < REFRESH_INTERVAL_SECONDS * 1000) return; // enforce refresh interval
    lastStationRefreshRef.current = timestamp;

    // update marker styling
    const newestMarker = stationMarkers.reduce((prev, current) => {
      return prev && prev.marker.dataset.timestamp > current.marker.dataset.timestamp
        ? prev
        : current;
    });
    const stations = await listStationsUpdatedSince(
      Math.round(Number(newestMarker.marker.dataset.timestamp) / 1000)
    );
    let geoJson = getStationGeoJson(stations);
    if (!geoJson || !geoJson.features.length) {
      // due to a small difference between js Date.now() and Firestore date, a few records
      // which update around the refresh time will be missed, so now we check for missed updates
      let distinctTimestamps = [...new Set(stationMarkers.map((m) => m.marker.dataset.timestamp))];
      if (distinctTimestamps.length < 2) return;

      // find oldest and next oldest timestamp
      let min = Infinity;
      let secondMin = Infinity;
      for (const t of distinctTimestamps) {
        if (t < min) {
          secondMin = min;
          min = t;
        } else if (t < secondMin) {
          secondMin = t;
        }
      }

      // if oldest timestamp is greater than 1 interval (+10% buffer) than
      // the next oldest timestamp, then we missed some records
      if (secondMin - min > 1.1 * REFRESH_INTERVAL_SECONDS * 1000) {
        const stations = [];
        const oldestMarkers = stationMarkers.filter((m) => {
          return m.marker.dataset.timestamp === min;
        });
        for (const m of oldestMarkers) {
          const station = await getStationById(m.marker.id);
          if (station) stations.push(station);
        }
        geoJson = getStationGeoJson(stations);
        timestamp = secondMin; // update missed records with the oldest valid timestamp
      }
      if (!geoJson || !geoJson.features.length) return;
    }

    const updatedIds = [];
    for (const item of stationMarkers) {
      const matches = geoJson.features.filter((f) => {
        return f.properties.dbId === item.marker.id;
      });
      if (!matches || !matches.length) continue;

      const f = matches[0];
      const name = f.properties.name;
      const currentAvg = f.properties.currentAverage;
      const currentGust = f.properties.currentGust;
      const currentBearing = f.properties.currentBearing;
      const validBearings = f.properties.validBearings;
      const isOffline = f.properties.isOffline;

      item.marker.dataset.timestamp = timestamp;
      item.marker.dataset.avg = currentAvg == null ? '' : currentAvg;
      item.marker.dataset.gust = currentGust == null ? '' : currentGust;
      for (const child of item.marker.children) {
        const [img, color] = getArrowStyle(currentAvg, currentBearing, validBearings, isOffline);
        if (child.className === 'marker-text') {
          child.style.color = color;
          if (isOffline) {
            child.innerHTML = 'X';
          } else {
            child.innerHTML =
              currentAvg == null
                ? '-'
                : Math.round(unitRef.current === 'kt' ? currentAvg / 1.852 : currentAvg);
          }
        } else if (child.className === 'marker-arrow') {
          child.style.backgroundImage = img;
          child.style.transform =
            currentBearing == null ? '' : `rotate(${Math.round(currentBearing)}deg)`;
        }

        // update popup
        let html = `<p align="center"><strong>${name}</strong></p>`;
        if (isOffline) {
          html += '<p style="color: red;" align="center">Offline</p>';
        } else {
          if (currentAvg == null && currentGust == null) {
            html += `<p align="center">-</p>`;
          } else {
            let temp = '';
            if (currentAvg != null) {
              if (currentGust != null) {
                temp = `${Math.round(unitRef.current === 'kt' ? currentAvg / 1.852 : currentAvg)} - ${Math.round(unitRef.current === 'kt' ? currentGust / 1.852 : currentGust)}`;
              } else {
                temp = `${Math.round(unitRef.current === 'kt' ? currentAvg / 1.852 : currentAvg)}`;
              }
            }
            const unit = unitRef.current === 'kt' ? 'kt' : 'km/h';
            html += `<p align="center">${temp} ${unit} ${currentBearing == null ? '' : getWindDirectionFromBearing(currentBearing)}</p>`;
          }
        }
        item.popup.setHTML(html);
      }

      updatedIds.push(item.marker.id);
    }
    // trigger refresh in Station component
    setRefreshedStations(updatedIds);
  }

  async function refreshWebcams() {
    if (document.visibilityState !== 'visible') return;
    if (webcamsHiddenRef.current) return;
    if (!webcamMarkers.length) return;

    let timestamp = Date.now();
    if (timestamp - lastWebcamRefreshRef.current < REFRESH_INTERVAL_SECONDS * 1000) return; // enforce refresh interval
    lastWebcamRefreshRef.current = timestamp;

    // update marker styling
    const newestMarker = webcamMarkers.reduce((prev, current) => {
      return prev && prev.dataset.timestamp > current.dataset.timestamp ? prev : current;
    });
    const webcams = await listCamsUpdatedSince(
      Math.round(Number(newestMarker.dataset.timestamp) / 1000)
    );
    let geoJson = getWebcamGeoJson(webcams);
    if (!geoJson || !geoJson.features.length) {
      // check for missed updates
      let distinctTimestamps = [...new Set(webcamMarkers.map((m) => m.dataset.timestamp))];
      if (distinctTimestamps.length < 2) return;

      let min = Infinity;
      let secondMin = Infinity;
      for (const t of distinctTimestamps) {
        if (t < min) {
          secondMin = min;
          min = t;
        } else if (t < secondMin) {
          secondMin = t;
        }
      }

      if (secondMin - min > 1.1 * REFRESH_INTERVAL_SECONDS * 1000) {
        const cams = [];
        const oldestMarkers = webcamMarkers.filter((m) => {
          return m.dataset.timestamp === min;
        });
        for (const m of oldestMarkers) {
          const cam = await getCamById(m.id);
          if (cam) cams.push(cam);
        }
        geoJson = getWebcamGeoJson(cams);
        timestamp = secondMin; // update missed records with the oldest valid timestamp
      }
      if (!geoJson || !geoJson.features.length) return;
    }

    const updatedIds = [];
    for (const item of webcamMarkers) {
      const matches = geoJson.features.filter((f) => {
        return f.properties.dbId === item.id;
      });
      if (!matches || !matches.length) continue;

      const f = matches[0];
      const currentTime = f.properties.currentTime;
      const currentUrl = f.properties.currentUrl;

      item.dataset.timestamp = timestamp;
      for (const child of item.children) {
        if (child.className === 'webcam-img') {
          // don't display cams that havent updated in last 24h
          child.src =
            timestamp - currentTime.getTime() > 24 * 60 * 60 * 1000
              ? ''
              : `${APIROOT}/${currentUrl}`;
        } else if (child.className === 'webcam-text-date') {
          if (timestamp - currentTime.getTime() > 24 * 60 * 60 * 1000) {
            child.innerHTML = 'No images in the last 24h.';
            child.style.color = 'red';
          } else {
            child.innerHTML = format(currentTime, 'dd MMM HH:mm');
            child.style.color = '';
          }
        }
      }

      updatedIds.push(item.id);
    }
    // trigger refresh in Webcam component
    setRefreshedWebcams(updatedIds);
  }

  // change unit
  useEffect(() => {
    unitRef.current = cookies.unit === 'kt' ? 'kt' : 'kmh';
    for (const item of stationMarkers) {
      const currentAvg = item.marker.dataset.avg === '' ? null : Number(item.marker.dataset.avg);
      const currentGust = item.marker.dataset.gust === '' ? null : Number(item.marker.dataset.gust);

      for (const child of item.marker.children) {
        if (child.className === 'marker-text') {
          if (currentAvg != null) {
            child.innerHTML = Math.round(
              unitRef.current === 'kt' ? currentAvg / 1.852 : currentAvg
            );
          }
        }
      }

      // update popup
      let temp = '';
      if (currentAvg != null) {
        if (currentGust != null) {
          temp = `${Math.round(unitRef.current === 'kt' ? currentAvg / 1.852 : currentAvg)} - ${Math.round(unitRef.current === 'kt' ? currentGust / 1.852 : currentGust)}`;
        } else {
          temp = `${Math.round(unitRef.current === 'kt' ? currentAvg / 1.852 : currentAvg)}`;
        }
      }
      const unit = unitRef.current === 'kt' ? 'kt' : 'km/h';
      temp += ` ${unit}`;

      const regex = /(\d+\s-\s\d+\s|\d+\s)(km\/h|kt)/g;
      const html = item.popup._content.innerHTML.replace(regex, temp);
      item.popup.setHTML(html);
    }
  }, [cookies.unit]);

  const map = useRef(null);
  const mapContainer = useRef(null);

  useEffect(() => {
    const evenDay = new Date().getDate() % 2 == 0;
    mapboxgl.accessToken = evenDay
      ? process.env.REACT_APP_MAPBOX_GL_KEY
      : process.env.REACT_APP_MAPBOX_GL_KEY_BACKUP;

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
    map.current.addControl(new MapUnitControl(), 'top-right');
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        }
      })
    );

    map.current.on('load', async () => {
      await initialiseStations();
      await initialiseWebcams();

      // poll for new data
      const interval = setInterval(
        async () => {
          try {
            await refreshStations();
            await refreshWebcams();
          } catch {
            if (interval) {
              clearInterval(interval);
            }
          }
        },
        REFRESH_INTERVAL_SECONDS * 1000 // every REFRESH_INTERVAL seconds
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

  // refresh on visibility change
  useEffect(() => {
    document.addEventListener('visibilitychange', () => {
      refreshStations();
      refreshWebcams();
    });
    return () => {
      document.removeEventListener('visibilitychange', () => {
        refreshStations();
        refreshWebcams();
      });
    };
  }, []);

  function handleWebcamClick() {
    for (const marker of webcamMarkers) {
      marker.style.visibility = showWebcams ? 'hidden' : 'visible';
    }
    webcamsHiddenRef.current = showWebcams;
    if (!showWebcams) {
      refreshWebcams();
    }
    setShowWebcams(!showWebcams);
  }

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
          <img
            src="/question-mark.png"
            style={{
              width: '26px',
              height: '26px'
            }}
          />
        </IconButton>
        <IconButton
          color="primary"
          sx={{
            backgroundColor: 'white',
            color: '#333333',
            borderRadius: '4px',
            boxShadow: '0 0 0 2px rgba(0,0,0,.1)',
            position: 'absolute',
            top: 0,
            left: 35,
            m: '10px',
            width: '29px',
            height: '29px',
            zIndex: 5,
            '&:hover': {
              backgroundColor: '#f2f2f2'
            }
          }}
          onClick={() => {
            navigate('/grid');
          }}
        >
          <GridViewIcon sx={{ width: '26px', height: '16px', opacity: 0.7 }} />
        </IconButton>
        <IconButton
          color="primary"
          sx={{
            backgroundColor: 'white',
            color: '#333333',
            borderRadius: '4px',
            boxShadow: '0 0 0 2px rgba(0,0,0,.1)',
            position: 'absolute',
            top: 0,
            left: 70,
            m: '10px',
            width: '29px',
            height: '29px',
            zIndex: 5,
            '&:hover': {
              backgroundColor: '#f2f2f2'
            }
          }}
          onClick={handleWebcamClick}
        >
          <img
            src="/camera.png"
            style={{
              width: '26px',
              height: '16px',
              opacity: showWebcams ? 1 : 0.5
            }}
          />
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
