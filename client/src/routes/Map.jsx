import { useEffect, useRef, useState } from 'react';
import { Outlet, useLoaderData, useNavigate } from 'react-router-dom';
import { list } from '../firebase';

import { createTheme, ThemeProvider } from '@mui/material';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';

import MapTerrainControl from './MapTerrainControl';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import arrowGreen from '../images/arrow-green.png';
import arrowYellow from '../images/arrow-yellow.png';
import arrowRed from '../images/arrow-red.png';

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
          currentAverage: site.currentAverage,
          currentGust: site.currentGust,
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
  const navigate = useNavigate();

  useEffect(() => {
    mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_GL_KEY;

    if (map.current) return;
    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v11',
      center: [172.5, -41],
      zoom: 4.3,
      pitchWithRotate: false,
      touchPitch: false
    });

    m.dragRotate.disable();
    m.touchZoomRotate.disableRotation();

    // -------------- CONTROLS -----------------------
    m.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        }
      })
    );
    m.addControl(new MapTerrainControl(), 'top-right');
    m.addControl(
      new mapboxgl.NavigationControl({
        showCompass: false
      }),
      'top-right'
    );

    // --------------- LIFECYCLE -----------------------
    m.on('load', () => {
      map.current = m;
      m.resize();
    });

    m.on('style.load', () => {
      m.loadImage(arrowGreen, (error, image) => {
        if (error) throw error;
        m.addImage('arrow-green', image);
      });
      m.loadImage(arrowYellow, (error, image) => {
        if (error) throw error;
        m.addImage('arrow-yellow', image);
      });
      m.loadImage(arrowRed, (error, image) => {
        if (error) throw error;
        m.addImage('arrow-red', image);
      });

      m.addSource('sites', {
        type: 'geojson',
        data: sitesGeoJson,
        generateId: true
      });
      m.addLayer({
        id: 'sites-layer',
        type: 'symbol',
        source: 'sites',
        layout: {
          'text-font': ['Lato Black'],
          'text-padding': 0,
          'text-anchor': 'center',
          'text-size': 10,
          'text-allow-overlap': true,
          'text-field': '{currentAverage}',
          'icon-image': [
            'case',
            ['<', ['get', 'currentAverage'], 20],
            'arrow-green',
            [
              'case',
              ['all', ['>=', ['get', 'currentAverage'], 20], ['<', ['get', 'currentAverage'], 30]],
              'arrow-yellow',
              'arrow-red'
            ]
          ],
          'icon-size': 0.07,
          'icon-allow-overlap': true,
          'icon-rotate': ['get', 'rotation']
        }
      });
    });

    // ----------------- EVENT HANDLERS -----------------------
    const handleSitesClick = (e) => {
      if (e.features.length) {
        navigate(`/sites/${e.features[0].properties.dbId}`);
      }
    };

    m.on('click', 'sites-layer', handleSitesClick);

    const handleSitesHoverOn = () => {
      m.getCanvas().style.cursor = 'pointer';
    };
    const handleSitesHoverOff = () => {
      m.getCanvas().style.cursor = '';
    };
    m.on('mouseenter', 'sites-layer', handleSitesHoverOn);
    m.on('mousemove', 'sites-layer', handleSitesHoverOn);
    m.on('mouseleave', 'sites-layer', handleSitesHoverOff);
  });

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
