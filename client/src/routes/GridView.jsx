import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCookies } from 'react-cookie';
import * as geofire from 'geofire-common';
import { listStationsUpdatedSince, listStationsWithinRadius } from '../services/stationService';
import { getWindColor, getWindDirectionFromBearing } from '../helpers/utils';

import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import Modal from '@mui/material/Modal';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';

import { alpha, styled } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

function useInterval(callback, delay) {
  const savedCallback = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

const StyledSlider = styled(Slider)(() => ({
  padding: '0 !important',
  '& .MuiSlider-thumb': {
    height: 15,
    width: 15,
    boxShadow: '0px 0px 2px 0px rgba(0, 0, 0, 0.01)',
    '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
      boxShadow: '0px 0px 3px 3px rgba(0, 0, 0, 0.2)'
    }
  }
}));

export default function GridView() {
  const REFRESH_INTERVAL_SECONDS = 60;
  const [position, setPosition] = useState(null);
  const posUpdatedRef = useRef(false);
  const lastRefreshRef = useRef(0);

  const [error, setError] = useState(null);
  const [outOfRange, setOutOfRange] = useState(false);
  const [data, setData] = useState([]);
  const [radius, setRadius] = useState(null);
  const [threshold, setThreshold] = useState(null);

  const [cookies, setCookies] = useCookies();
  const navigate = useNavigate();
  function handleClose() {
    navigate('/');
  }

  const cookiesOptions = {
    path: '/',
    maxAge: 31536000, // 365 days
    secure: true,
    sameSite: 'strict'
  };

  // read cookies
  useEffect(() => {
    if (cookies.gridRadius == null) {
      setCookies('gridRadius', 50, cookiesOptions);
    } else if (radius == null) {
      let r = 50;
      if (cookies.gridRadius == 50 || cookies.gridRadius == 100 || cookies.gridRadius == 150) {
        r = cookies.gridRadius;
      }
      setRadius(r);
    }

    if (cookies.gridThreshold == null) {
      setCookies('gridThreshold', 0, cookiesOptions);
    } else if (threshold == null) {
      let t = 0;
      if (cookies.gridThreshold >= 0 && cookies.gridThreshold <= 50) {
        t = Math.floor(cookies.gridThreshold);
      }
      setThreshold(t);
    }
  }, [cookies]);

  async function refresh() {
    if (document.visibilityState !== 'visible') return;
    if (!data.length) return;

    // only need to refresh when we haven't moved, grid updates when we move
    if (posUpdatedRef.current) return;

    const ts = Date.now();
    if (ts - lastRefreshRef.current < REFRESH_INTERVAL_SECONDS * 1000) return; // enforce refresh interval
    lastRefreshRef.current = ts;

    const newestItem = data.reduce((prev, current) => {
      return prev && prev.timestamp > current.timestamp ? prev : current;
    });
    const d = await listStationsUpdatedSince(
      Math.round(newestItem.timestamp / 1000),
      position.lat,
      position.lon,
      radius
    );

    let updated = false;
    const time = Date.now();
    const clone = JSON.parse(JSON.stringify(data)); // deep clone + set state to trigger re-render

    for (const item of d) {
      const matches = clone.filter((a) => {
        return a._id === item._id;
      });
      if (matches.length == 1) {
        updated = true;
        matches[0].currentAverage = item.currentAverage;
        matches[0].currentGust = item.currentGust;
        matches[0].currentBearing = item.currentBearing;
        matches[0].timestamp = time;
      }
    }

    if (updated) setData(clone);
  }

  function geoSuccess(pos) {
    if (geoError) setError(false);
    const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };

    // skip coord update if moved <1km to reduce db reads
    if (position) {
      const distance = geofire.distanceBetween(
        [position.lat, position.lon],
        [coords.lat, coords.lon]
      );
      if (distance < 1) {
        posUpdatedRef.current = false;
        return;
      }
    }

    posUpdatedRef.current = true;
    setPosition(coords);
  }
  function geoError() {
    setError(true);
  }

  // refresh on move, or when station data updates
  useInterval(() => {
    navigator.geolocation.getCurrentPosition(geoSuccess, geoError);
    refresh();
  }, REFRESH_INTERVAL_SECONDS * 1000);

  // init load
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(geoSuccess, geoError);
  }, []);

  async function loadData() {
    if (outOfRange) setOutOfRange(false);

    const d = await listStationsWithinRadius(position.lat, position.lon, radius);
    if (d.length) {
      const time = Date.now();
      for (const item of d) {
        item.timestamp = time;
      }
      setData(d);
    } else {
      setOutOfRange(true);
    }
  }

  useEffect(() => {
    if (error || !position) return;
    loadData();
  }, [position, error]);

  useEffect(() => {
    setCookies('gridRadius', radius, cookiesOptions);
    if (error || !position) return;
    loadData();
  }, [radius]);

  useEffect(() => {
    setCookies('gridThreshold', threshold, cookiesOptions);
  }, [threshold]);

  // refresh on visibility change
  useEffect(() => {
    document.addEventListener('visibilitychange', () => {
      refresh();
    });
    return () => {
      document.removeEventListener('visibilitychange', () => {
        refresh();
      });
    };
  }, []);

  return (
    <Modal open onClose={handleClose} disableAutoFocus={true}>
      <Container component="main" maxWidth="lg" sx={{ height: '100%' }}>
        <Stack direction="column" justifyContent="center" sx={{ height: '100%' }}>
          <Stack
            direction="column"
            alignItems="center"
            sx={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px' }}
          >
            <Stack direction="row" justifyContent="space-between" sx={{ width: '100%' }}>
              <Stack direction="row">
                <Stack direction="column" alignItems="center" sx={{ width: '80px', mr: 1 }}>
                  <StyledSlider
                    value={radius}
                    onChange={(event, value) => setRadius(value)}
                    step={50}
                    shiftStep={50}
                    min={50}
                    max={150}
                    sx={{ width: '50px', mb: 1 }}
                  />
                  <Typography sx={{ fontSize: '10px' }}>Radius: {radius} km</Typography>
                </Stack>
                <Stack direction="column" alignItems="center" sx={{ width: '100px' }}>
                  <StyledSlider
                    value={threshold}
                    onChange={(event, value) => setThreshold(value)}
                    min={0}
                    max={50}
                    sx={{ width: '50px', mb: 1 }}
                  />
                  <Typography sx={{ fontSize: '10px' }}>
                    Threshold:{' '}
                    {cookies.unit === 'kt'
                      ? `${Math.round(threshold / 1.852)} kt`
                      : `${threshold} km/h`}
                  </Typography>
                </Stack>
              </Stack>
              <Stack direction="row" alignItems="center">
                <Typography sx={{ fontSize: '12px', mr: 1 }}>
                  Unit: {cookies.unit === 'kt' ? 'kt' : 'km/h'}
                </Typography>
                <IconButton sx={{ p: 0 }} onClick={handleClose}>
                  <CloseIcon />
                </IconButton>
              </Stack>
            </Stack>
            {!outOfRange &&
              (error != null ? (
                !error &&
                (data.length ? (
                  <Box sx={{ maxHeight: '85vh', width: '100%', overflowY: 'scroll', mt: 1 }}>
                    <Grid container spacing={1}>
                      {data
                        .filter((a) => !a.isOffline && a.currentAverage >= threshold)
                        .map((d) => {
                          const color =
                            d.currentAverage != null ? getWindColor(d.currentAverage + 10) : ''; // arbitrary offset so colors are more relevant for xc
                          return (
                            <Grid key={d._id} item xs={data.length > 2 ? 4 : 12 / data.length}>
                              <Paper
                                onClick={() => {
                                  navigate(`../stations/${d._id}`);
                                }}
                                sx={{
                                  boxShadow: 'none',
                                  backgroundColor: color ? color : alpha('#a8a8a8', 0.1),
                                  p: 1,
                                  borderRadius: '8px',
                                  cursor: 'pointer'
                                }}
                              >
                                <Stack direction="column">
                                  <Typography noWrap align="center" sx={{ fontSize: '12px' }}>
                                    {d.name}
                                  </Typography>
                                  <Typography align="center" sx={{ fontSize: '18px' }}>
                                    {d.currentAverage == null
                                      ? '-'
                                      : Math.round(
                                          cookies.unit === 'kt'
                                            ? d.currentAverage / 1.852
                                            : d.currentAverage
                                        )}
                                    {' | '}
                                    {d.currentGust == null
                                      ? '-'
                                      : Math.round(
                                          cookies.unit === 'kt'
                                            ? d.currentGust / 1.852
                                            : d.currentGust
                                        )}
                                  </Typography>
                                  <Typography align="center" sx={{ fontSize: '14px' }}>
                                    {getWindDirectionFromBearing(d.currentBearing)}
                                  </Typography>
                                  <Typography align="center" sx={{ fontSize: '12px' }}>
                                    {d.distance} km
                                  </Typography>
                                </Stack>
                              </Paper>
                            </Grid>
                          );
                        })}
                    </Grid>
                  </Box>
                ) : (
                  <Skeleton height="20vh" width="100%" sx={{ transform: 'none', mt: 2 }}></Skeleton>
                ))
              ) : (
                <Skeleton height="20vh" width="100%" sx={{ transform: 'none', mt: 2 }}></Skeleton>
              ))}
            {(error == null || error) && (
              <Typography
                component="h1"
                variant={error ? 'h5' : 'caption'}
                align="center"
                sx={{ mt: 2, mb: 2, color: 'red' }}
              >
                Please grant location permissions, and &quot;remember&quot; the setting.
              </Typography>
            )}
            {outOfRange && (
              <Typography
                component="h1"
                variant={'h5'}
                align="center"
                sx={{ mt: 2, mb: 2, color: 'red' }}
              >
                No weather stations found within a {radius}km radius.
              </Typography>
            )}
          </Stack>
        </Stack>
      </Container>
    </Modal>
  );
}
