import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCookies } from 'react-cookie';
import * as geofire from 'geofire-common';
import { listStationsUpdatedSince, listStationsWithinRadius } from '../firebase';
import { getWindColor, getWindDirectionFromBearing } from '../helpers/utils';

import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import CloseIcon from '@mui/icons-material/Close';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import { alpha } from '@mui/material';

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

export default function GridView() {
  const REFRESH_INTERVAL_SECONDS = 60;
  const [position, setPosition] = useState(null);
  const posUpdatedRef = useRef(false);
  const lastRefreshRef = useRef(0);

  const [error, setError] = useState(null);
  const [outOfRange, setOutOfRange] = useState(false);
  const [data, setData] = useState([]);

  const [cookies] = useCookies();
  const navigate = useNavigate();
  function handleClose() {
    navigate('/');
  }

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
      new Date(newestItem.timestamp),
      data.map((a) => a.id)
    );

    let updated = false;
    const time = Date.now();
    const clone = JSON.parse(JSON.stringify(data)); // deep clone + set state to trigger re-render

    for (const item of d) {
      const matches = clone.filter((a) => {
        return a.id === item.id;
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

  useEffect(() => {
    if (error || !position) return;

    async function loadData() {
      if (outOfRange) setOutOfRange(false);

      let d = await listStationsWithinRadius(position.lat, position.lon, 50);
      if (!d.length) d = await listStationsWithinRadius(position.lat, position.lon, 100);
      if (!d.length) d = await listStationsWithinRadius(position.lat, position.lon, 200);

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

    loadData();
  }, [position, error]);

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
            <Stack direction="row" justifyContent="end" sx={{ width: '100%' }}>
              <IconButton sx={{ p: 0 }} onClick={handleClose}>
                <CloseIcon />
              </IconButton>
            </Stack>
            {!outOfRange &&
              (error != null ? (
                !error &&
                (data.length ? (
                  <Box sx={{ maxHeight: '90vh', width: '100%', overflowY: 'scroll', mt: 1 }}>
                    <Grid container spacing={1}>
                      {data.map((d) => {
                        const color =
                          d.currentAverage != null ? getWindColor(d.currentAverage + 10) : ''; // arbitrary offset so colors are more relevant for xc
                        return (
                          <Grid key={d.id} item xs={data.length > 2 ? 4 : 12 / data.length}>
                            <Paper
                              onClick={() => {
                                navigate(`../stations/${d.id}`);
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
                No weather stations found within a 200km radius.
              </Typography>
            )}
          </Stack>
        </Stack>
      </Container>
    </Modal>
  );
}
