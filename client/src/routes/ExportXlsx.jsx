import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

import { MobileDatePicker } from '@mui/x-date-pickers/MobileDatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { enGB } from 'date-fns/locale';

function MapView() {
  const mapContainer = useRef(null);
  const map = useRef(null);

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
    return () => map.current?.remove();
  }, []);

  return <Box ref={mapContainer} sx={{ width: '100%', height: '50vh', marginBottom: 0 }} />;
}

export default function ExportXlsx() {
  const navigate = useNavigate();
  function handleClose() {
    navigate('/');
  }

  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const [dateTo, setDateTo] = useState(new Date());
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
    const unixFrom = Math.floor(dateFrom.getTime() / 1000);
    const unixTo = Math.floor(dateTo.getTime() / 1000);

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

    console.log(key);

    try {
      // await emailjs.sendForm(
      //   process.env.REACT_APP_EMAILJS_SERVICE_ID,
      //   process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
      //   e.target,
      //   { publicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY }
      // );

      setLoading(false);
    } catch (error) {
      setLoading(false);
      setErrorMsg(error.message);
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
            <MapView />
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
