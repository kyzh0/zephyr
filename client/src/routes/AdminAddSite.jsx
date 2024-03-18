import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import axios from 'axios';

import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import LoadingButton from '@mui/lab/LoadingButton';
import CloseIcon from '@mui/icons-material/Close';
import { addDoc, collection, GeoPoint } from 'firebase/firestore';

export default function Site() {
  const navigate = useNavigate();
  function handleClose() {
    navigate('/');
  }
  async function handleSignOut() {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error(error);
    }
  }

  const [type, setType] = useState('');
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
    const latitude = data.get('lat').trim();
    const longitude = data.get('lon').trim();

    // input validation
    if (!name || !externalId || !externalLink || !latitude || !longitude || !type) {
      setLoading(false);
      setErrorMsg('Complete all fields');
      setIsError(true);
      return;
    }

    const lat = Number(latitude);
    const lon = Number(longitude);
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

    let harvestWindAvgId = '';
    let harvestWindGustId = '';
    let harvestWindDirId = '';
    let harvestTempId = '';
    if (type === 'harvest') {
      harvestWindAvgId = data.get('harvestWindAvgId').trim();
      harvestWindGustId = data.get('harvestWindGustId').trim();
      harvestWindDirId = data.get('harvestWindDirId').trim();
      harvestTempId = data.get('harvestTempId').trim();
      if (!harvestWindAvgId || !harvestWindGustId || !harvestWindDirId || !harvestTempId) {
        setLoading(false);
        setErrorMsg('Complete all Harvest fields');
        setIsError(true);
        return;
      }
      const regex = /[0-9]+_[0-9]+/g;
      if (
        !externalId.match(regex) ||
        !harvestWindAvgId.match(regex) ||
        !harvestWindGustId.match(regex) ||
        !harvestWindDirId.match(regex) ||
        !harvestTempId.match(regex)
      ) {
        setLoading(false);
        setErrorMsg('Invalid Harvest ID');
        setIsError(true);
        return;
      }
    }

    try {
      let elevation = 0;
      const { data } = await axios.get(
        `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`
      );
      if (data.elevation && data.elevation.length) {
        elevation = data.elevation[0];
      }

      const site = {
        name: name,
        externalId: externalId,
        externalLink: externalLink,
        type: type,
        coordinates: new GeoPoint(lat, lon),
        currentAverage: 0,
        currentGust: 0,
        currentBearing: 0,
        currentTemperature: 0,
        elevation: elevation
      };
      if (type === 'harvest') {
        site.harvestWindAverageId = harvestWindAvgId;
        site.harvestWindGustId = harvestWindGustId;
        site.harvestWindDirectionId = harvestWindDirId;
        site.harvestTemperatureId = harvestTempId;
      }

      await addDoc(collection(db, 'sites'), site);

      setLoading(false);
      handleClose();
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={handleClose}>
      <Container component="main" maxWidth="xs" sx={{ height: '100%' }}>
        <Stack direction="column" justifyContent="center" sx={{ height: '100%' }}>
          <Stack
            direction="column"
            alignItems="center"
            sx={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px' }}
          >
            <Stack direction="row" justifyContent="space-between" sx={{ width: '100%' }}>
              <Link
                variant="body2"
                underline="hover"
                sx={{ cursor: 'pointer' }}
                onClick={handleSignOut}
              >
                sign out
              </Link>
              <IconButton sx={{ p: 0 }} onClick={handleClose}>
                <CloseIcon />
              </IconButton>
            </Stack>
            <Typography component="h1" variant="h5" gutterBottom>
              Add New Site
            </Typography>
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
              <TextField
                margin="dense"
                fullWidth
                id="name"
                label="Site Name"
                name="name"
                error={isError}
                helperText={isError && errorMsg}
              />
              <TextField
                margin="dense"
                fullWidth
                id="externalId"
                label="External Id"
                name="externalId"
              />
              <TextField
                margin="dense"
                fullWidth
                id="externalLink"
                label="External Link"
                name="externalLink"
              />
              <TextField
                sx={{ mb: 0 }}
                select
                margin="dense"
                fullWidth
                id="type"
                label="Type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                }}
              >
                <MenuItem value="harvest">Harvest</MenuItem>
                <MenuItem value="holfuy">Holfuy</MenuItem>
                <MenuItem value="metservice">Metservice</MenuItem>
              </TextField>
              <TextField margin="dense" fullWidth id="lat" label="Latitude" name="lat" />
              <TextField margin="dense" fullWidth id="lon" label="Longitude" name="lon" />
              {type === 'harvest' && (
                <>
                  <TextField
                    margin="dense"
                    fullWidth
                    id="harvestWindAvgId"
                    label="Harvest Wind Avg GraphID_TraceID"
                    name="harvestWindAvgId"
                  />
                  <TextField
                    margin="dense"
                    fullWidth
                    id="harvestWindGustId"
                    label="Harvest Wind Gust GraphID_TraceID"
                    name="harvestWindGustId"
                  />
                  <TextField
                    margin="dense"
                    fullWidth
                    id="harvestWindDirId"
                    label="Harvest Wind Direction GraphID_TraceID"
                    name="harvestWindDirId"
                  />
                  <TextField
                    margin="normal"
                    fullWidth
                    id="harvestTempId"
                    label="Harvest Temperature GraphID_TraceID"
                    name="harvestTempId"
                  />
                </>
              )}
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
