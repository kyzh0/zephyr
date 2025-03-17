import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';

import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import LoadingButton from '@mui/lab/LoadingButton';
import CloseIcon from '@mui/icons-material/Close';
import { getStationById } from '../services/stationService';

export default function AdminEditStation() {
  const navigate = useNavigate();
  const location = useLocation();
  function handleClose() {
    if (location.key === 'default') {
      navigate('/');
    } else {
      navigate(-1);
    }
  }

  const { id } = useParams();
  const [stationData, setStationData] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!id) {
      navigate('/');
    }

    async function load() {
      const s = await getStationById(id);
      if (s) setStationData(JSON.stringify(s, null, 4));
      setLoading(false);
    }

    load();
  }, [id]);

  async function handleSubmit(e) {
    if (loading) {
      return;
    }

    e.preventDefault();
    setLoading(true);

    const data = new FormData(e.currentTarget);
    const d = data.get('data').trim();
    if (!d) {
      setLoading(false);
      return;
    }

    try {
      // validate and save
    } catch {
      setError(true);
      setErrorMsg('Data is not valid.');
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={handleClose} disableAutoFocus={true}>
      <Container component="main" maxWidth="xs" sx={{ height: '100%' }}>
        <Stack direction="column" justifyContent="center" sx={{ height: '100%' }}>
          <Stack
            direction="column"
            alignItems="center"
            sx={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px' }}
          >
            <Stack direction="row-reverse" sx={{ width: '100%' }}>
              <IconButton sx={{ p: 0 }} onClick={handleClose}>
                <CloseIcon />
              </IconButton>
            </Stack>
            <Typography component="h1" variant="h5" gutterBottom>
              Edit Station Data
            </Typography>
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                fullWidth
                id="data"
                name="data"
                multiline
                helperText={error && errorMsg}
                value={stationData}
                onChange={(e) => setStationData(e.target.value)}
                sx={{
                  maxHeight: '70vh',
                  overflowY: 'scroll'
                }}
              />
              <LoadingButton
                loading={loading}
                fullWidth
                variant="contained"
                sx={{
                  marginTop: '12px',
                  marginBottom: '12px',
                  height: '50px',
                  boxShadow: 'none'
                }}
              >
                Save
              </LoadingButton>
            </Box>
          </Stack>
        </Stack>
      </Container>
    </Modal>
  );
}
