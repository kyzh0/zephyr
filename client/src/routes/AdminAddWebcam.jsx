import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';

import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import LoadingButton from '@mui/lab/LoadingButton';
import CloseIcon from '@mui/icons-material/Close';
import { addDoc, collection, GeoPoint } from 'firebase/firestore';

export default function AdminAddWebcam() {
  const navigate = useNavigate();
  function handleClose() {
    navigate('/');
  }

  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
    const externalId = data.get('externalId').trim();
    const externalLink = data.get('externalLink').trim();
    const coordinates = data.get('coordinates').trim();
    const type = data.get('type').trim();

    // input validation
    if (!name || !externalId || !externalLink || !coordinates || !type) {
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
      const cam = {
        name: name,
        externalId: externalId,
        externalLink: externalLink,
        type: type,
        coordinates: new GeoPoint(
          Math.round(lat * 1000000) / 1000000, // round to 6dp
          Math.round(lon * 1000000) / 1000000
        )
      };

      await addDoc(collection(db, 'cams'), cam);

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
              Add New Webcam
            </Typography>
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
              <TextField
                margin="dense"
                fullWidth
                id="name"
                label="Webcam Name"
                name="name"
                required
                error={isError}
                helperText={isError && errorMsg}
              />
              <TextField
                margin="dense"
                fullWidth
                id="externalId"
                label="External ID"
                name="externalId"
                required
              />
              <TextField
                margin="dense"
                fullWidth
                id="externalLink"
                label="External Link"
                name="externalLink"
                required
              />
              <TextField margin="dense" fullWidth id="type" label="Type" name="type" required />
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
