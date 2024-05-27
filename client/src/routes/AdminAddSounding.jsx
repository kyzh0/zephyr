import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';

import { addSounding } from '../services/soundingService';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import LoadingButton from '@mui/lab/LoadingButton';
import CloseIcon from '@mui/icons-material/Close';

export default function AdminAddSounding() {
  const navigate = useNavigate();
  function handleClose() {
    navigate('/');
  }

  const { userKey } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [raspRegion, setRaspRegion] = useState('');

  async function handleSubmit(e) {
    if (loading) {
      return;
    }

    e.preventDefault();
    setLoading(true);

    setErrorMsg('');
    setIsError(false);

    const data = new FormData(e.currentTarget);
    const name = data.get('name').trim();
    const raspId = data.get('raspId').trim();
    const coordinates = data.get('coordinates').trim();

    // input validation
    if (!name || !raspRegion || !raspId || !coordinates) {
      setLoading(false);
      setErrorMsg('Complete all fields');
      setIsError(true);
      return;
    }

    const coords = coordinates.replace(' ', '').split(',');
    if (coords.length != 2) {
      setLoading(false);
      setErrorMsg('Coordinates are invalid');
      setIsError(true);
      return;
    }
    const lat = Number(coords[0]);
    const lon = Number(coords[1]);
    if (isNaN(lat)) {
      setLoading(false);
      setErrorMsg('Latitude is invalid');
      setIsError(true);
      return;
    }
    if (isNaN(lon)) {
      setLoading(false);
      setErrorMsg('Longitude is invalid');
      setIsError(true);
      return;
    }

    if (lat < -90 || lat > 90) {
      setLoading(false);
      setErrorMsg('Latitude must be between -90 and 90');
      setIsError(true);
      return;
    }
    if (lon < -180 || lon > 180) {
      setLoading(false);
      setErrorMsg('Longitude must be between -180 and 180');
      setIsError(true);
      return;
    }

    try {
      const sounding = {
        name: name,
        raspRegion: raspRegion,
        raspId: raspId,
        coordinates: [Math.round(lon * 1000000) / 1000000, Math.round(lat * 1000000) / 1000000]
      };
      await addSounding(sounding, userKey);

      setLoading(false);
      handleClose();
    } catch (error) {
      console.error(error);
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
            <Stack direction="row" justifyContent="end" sx={{ width: '100%' }}>
              <IconButton sx={{ p: 0 }} onClick={handleClose}>
                <CloseIcon />
              </IconButton>
            </Stack>
            <Typography component="h1" variant="h5" gutterBottom>
              Add New Sounding
            </Typography>
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
              <TextField
                margin="dense"
                fullWidth
                id="name"
                label="Sounding Name"
                name="name"
                required
                error={isError}
                helperText={isError && errorMsg}
              />
              <TextField
                select
                margin="dense"
                fullWidth
                id="raspRegion"
                label="RASP Region"
                required
                value={raspRegion}
                onChange={(e) => {
                  setRaspRegion(e.target.value);
                }}
              >
                <MenuItem value="NZNORTH_N">NZNORTH_N</MenuItem>
                <MenuItem value="NZNORTH_C">NZNORTH_C</MenuItem>
                <MenuItem value="NZSOUTH_N">NZSOUTH_N</MenuItem>
                <MenuItem value="NZSOUTH_S">NZSOUTH_S</MenuItem>
              </TextField>
              <TextField
                margin="dense"
                fullWidth
                id="raspId"
                label="RASP ID"
                name="raspId"
                required
              />
              <TextField
                margin="dense"
                fullWidth
                id="coordinates"
                label="Latitude, Longitude"
                name="coordinates"
                required
              />
              <LoadingButton
                loading={loading}
                type="submit"
                fullWidth
                variant="contained"
                sx={{
                  marginTop: '12px',
                  marginBottom: '12px',
                  height: '50px',
                  boxShadow: 'none'
                }}
              >
                Add
              </LoadingButton>
            </Box>
          </Stack>
        </Stack>
      </Container>
    </Modal>
  );
}
