import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import axios from 'axios';

import { addStation } from '../services/stationService';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import LoadingButton from '@mui/lab/LoadingButton';
import CloseIcon from '@mui/icons-material/Close';

export default function AdminAddStation() {
  const navigate = useNavigate();
  function handleClose() {
    navigate('/');
  }

  const { userKey } = useContext(AppContext);
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
    const coordinates = data.get('coordinates').trim();
    const bearings = data.get('bearings').trim();

    // input validation
    if (!name || !externalId || !externalLink || !coordinates || !type) {
      setLoading(false);
      setErrorMsg('Complete all fields');
      setIsError(true);
      return;
    }

    if (type === 'harvest') {
      if (!externalLink.toUpperCase().includes('HARVEST')) {
        setLoading(false);
        setErrorMsg('URL is not a valid Harvest link');
        setIsError(true);
        return;
      }
    } else if (type === 'metservice') {
      if (!externalLink.toUpperCase().includes('METSERVICE')) {
        setLoading(false);
        setErrorMsg('URL is not a valid Metservice link');
        setIsError(true);
        return;
      }
    } else if (type === 'holfuy') {
      if (!externalLink.toUpperCase().includes('HOLFUY')) {
        setLoading(false);
        setErrorMsg('URL is not a valid Holfuy link');
        setIsError(true);
        return;
      }
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

    const regex = /^[0-9]{3}-[0-9]{3}(,[0-9]{3}-[0-9]{3})*$/g;
    if (bearings && !bearings.match(regex)) {
      setLoading(false);
      setErrorMsg('Directions is invalid');
      setIsError(true);
      return;
    }

    let harvestConfigId = '';
    let harvestWindAvgGraphId = '';
    let harvestWindAvgTraceId = '';
    let harvestWindGustGraphId = '';
    let harvestWindGustTraceId = '';
    let harvestWindDirGraphId = '';
    let harvestWindDirTraceId = '';
    let harvestTempGraphId = '';
    let harvestTempTraceId = '';
    if (type === 'harvest') {
      harvestConfigId = data.get('harvestConfigId').trim();
      harvestWindAvgGraphId = data.get('harvestWindAvgGraphId').trim();
      harvestWindAvgTraceId = data.get('harvestWindAvgTraceId').trim();
      harvestWindGustGraphId = data.get('harvestWindGustGraphId').trim();
      harvestWindGustTraceId = data.get('harvestWindGustTraceId').trim();
      harvestWindDirGraphId = data.get('harvestWindDirGraphId').trim();
      harvestWindDirTraceId = data.get('harvestWindDirTraceId').trim();
      harvestTempGraphId = data.get('harvestTempGraphId').trim();
      harvestTempTraceId = data.get('harvestTempTraceId').trim();
      if (
        !harvestConfigId ||
        !harvestWindAvgGraphId ||
        !harvestWindAvgTraceId ||
        !harvestWindGustGraphId ||
        !harvestWindGustTraceId ||
        !harvestWindDirGraphId ||
        !harvestWindDirTraceId ||
        !harvestTempGraphId ||
        !harvestTempTraceId
      ) {
        setLoading(false);
        setErrorMsg('Complete all Harvest fields');
        setIsError(true);
        return;
      }
      const regex1 = /^[0-9]+$/g;
      if (
        !externalId.match(regex1) ||
        !harvestConfigId.match(regex1) ||
        !harvestWindAvgGraphId.match(regex1) ||
        !harvestWindAvgTraceId.match(regex1) ||
        !harvestWindGustGraphId.match(regex1) ||
        !harvestWindGustTraceId.match(regex1) ||
        !harvestWindDirGraphId.match(regex1) ||
        !harvestWindDirTraceId.match(regex1) ||
        !harvestTempGraphId.match(regex1) ||
        !harvestTempTraceId.match(regex1)
      ) {
        setLoading(false);
        setErrorMsg('Invalid Harvest ID');
        setIsError(true);
        return;
      }
    }

    let gwWindAvgFieldName = '';
    let gwWindGustFieldName = '';
    let gwWindBearingFieldName = '';
    let gwTemperatureFieldName = '';
    if (type === 'gw') {
      gwWindAvgFieldName = data.get('gwWindAvgFieldName').trim();
      gwWindGustFieldName = data.get('gwWindGustFieldName').trim();
      gwWindBearingFieldName = data.get('gwWindBearingFieldName').trim();
      gwTemperatureFieldName = data.get('gwTemperatureFieldName').trim();
    }

    try {
      const station = {
        name: name,
        type: type,
        coordinates: [Math.round(lon * 1000000) / 1000000, Math.round(lat * 1000000) / 1000000],
        externalLink: externalLink,
        externalId: externalId
      };
      const { data } = await axios.get(
        `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`
      );
      if (data.elevation && data.elevation.length) {
        station.elevation = data.elevation[0];
      }
      if (bearings) {
        station.validBearings = bearings;
      }
      if (type === 'harvest') {
        station.externalId = `${externalId}_${harvestConfigId}`;
        station.harvestWindAverageId = `${harvestWindAvgGraphId}_${harvestWindAvgTraceId}`;
        station.harvestWindGustId = `${harvestWindGustGraphId}_${harvestWindGustTraceId}`;
        station.harvestWindDirectionId = `${harvestWindDirGraphId}_${harvestWindDirTraceId}`;
        station.harvestTemperatureId = `${harvestTempGraphId}_${harvestTempTraceId}`;
      }
      if (type === 'gw') {
        station.gwWindAverageFieldName = gwWindAvgFieldName;
        station.gwWindGustFieldName = gwWindGustFieldName;
        station.gwWindBearingFieldName = gwWindBearingFieldName;
        station.gwTemperatureFieldName = gwTemperatureFieldName;
      }

      await addStation(station, userKey);

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
              Add New Station
            </Typography>
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
              <TextField
                margin="dense"
                fullWidth
                id="name"
                label="Station Name"
                name="name"
                required
                error={isError}
                helperText={isError && errorMsg}
              />
              {type === 'harvest' ? (
                <>
                  <TextField
                    margin="dense"
                    id="externalId"
                    label="External ID"
                    name="externalId"
                    required
                    sx={{ width: '49%' }}
                  />
                  <TextField
                    margin="dense"
                    id="harvestConfigId"
                    label="Config ID"
                    name="harvestConfigId"
                    required
                    sx={{ width: '49%', ml: '2%' }}
                  />
                </>
              ) : (
                <TextField
                  margin="dense"
                  fullWidth
                  id="externalId"
                  label="External ID"
                  name="externalId"
                  required
                />
              )}
              <TextField
                margin="dense"
                fullWidth
                id="externalLink"
                label="External Link"
                name="externalLink"
                required
              />
              <TextField
                select
                margin="dense"
                fullWidth
                id="type"
                label="Type"
                required
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                }}
              >
                <MenuItem value="harvest">Harvest</MenuItem>
                <MenuItem value="holfuy">Holfuy</MenuItem>
                <MenuItem value="metservice">Metservice</MenuItem>
                <MenuItem value="wu">Weather Underground</MenuItem>
                <MenuItem value="tempest">Tempest</MenuItem>
                <MenuItem value="attentis">Attentis</MenuItem>
                <MenuItem value="windguru">Windguru</MenuItem>
                <MenuItem value="wp">Weather Pro</MenuItem>
                <MenuItem value="gw">Greater Wellington</MenuItem>
              </TextField>
              <TextField
                margin="dense"
                fullWidth
                id="coordinates"
                label="Latitude, Longitude"
                name="coordinates"
                required
              />
              <TextField
                margin="dense"
                fullWidth
                id="bearings"
                label="Bearings CW 000-090,180-270"
                name="bearings"
              />
              {type === 'harvest' && (
                <>
                  <TextField
                    margin="dense"
                    id="harvestWindAvgGraphId"
                    label="Wind Avg GraphID"
                    name="harvestWindAvgGraphId"
                    required
                    sx={{ width: '49%' }}
                  />
                  <TextField
                    margin="dense"
                    id="harvestWindAvgTraceId"
                    label="Trace ID"
                    name="harvestWindAvgTraceId"
                    required
                    sx={{ width: '49%', ml: '2%' }}
                  />
                  <TextField
                    margin="dense"
                    id="harvestWindGustGraphId"
                    label="Wind Gust GraphID"
                    name="harvestWindGustGraphId"
                    required
                    sx={{ width: '49%' }}
                  />
                  <TextField
                    margin="dense"
                    id="harvestWindGustTraceId"
                    label="Trace ID"
                    name="harvestWindGustTraceId"
                    required
                    sx={{ width: '49%', ml: '2%' }}
                  />
                  <TextField
                    margin="dense"
                    id="harvestWindDirGraphId"
                    label="Wind Dir GraphID"
                    name="harvestWindDirGraphId"
                    required
                    sx={{ width: '49%' }}
                  />
                  <TextField
                    margin="dense"
                    id="harvestWindDirTraceId"
                    label="Trace ID"
                    name="harvestWindDirTraceId"
                    required
                    sx={{ width: '49%', ml: '2%' }}
                  />
                  <TextField
                    margin="dense"
                    id="harvestTempGraphId"
                    label="Temp GraphID"
                    name="harvestTempGraphId"
                    required
                    sx={{ width: '49%' }}
                  />
                  <TextField
                    margin="dense"
                    id="harvestTempTraceId"
                    label="Trace ID"
                    name="harvestTempTraceId"
                    required
                    sx={{ width: '49%', ml: '2%' }}
                  />
                </>
              )}
              {type === 'gw' && (
                <>
                  <TextField
                    margin="dense"
                    id="gwWindAvgFieldName"
                    label="Wind Avg Field Name"
                    name="gwWindAvgFieldName"
                    required
                    sx={{ width: '49%' }}
                  />
                  <TextField
                    margin="dense"
                    id="gwWindGustFieldName"
                    label="Wind Gust Field Name"
                    name="gwWindGustFieldName"
                    required
                    sx={{ width: '49%', ml: '2%' }}
                  />
                  <TextField
                    margin="dense"
                    id="gwWindBearingFieldName"
                    label="Wind Bearing Field Name"
                    name="gwWindBearingFieldName"
                    required
                    sx={{ width: '49%' }}
                  />
                  <TextField
                    margin="dense"
                    id="gwTemperatureFieldName"
                    label="Temperature Field Name"
                    name="gwTemperatureFieldName"
                    required
                    sx={{ width: '49%', ml: '2%' }}
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
