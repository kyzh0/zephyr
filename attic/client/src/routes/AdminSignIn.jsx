import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import axios from 'axios';

import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import LoadingButton from '@mui/lab/LoadingButton';
import CloseIcon from '@mui/icons-material/Close';

export default function AdminSignIn() {
  const navigate = useNavigate();
  function handleClose() {
    navigate('/');
  }

  const { userKey, setUserKey } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (userKey) {
      navigate('/admin/dashboard');
    }
  }, [userKey]);

  async function handleSubmit(e) {
    if (loading) {
      return;
    }

    e.preventDefault();
    setLoading(true);

    setErrorMsg('');
    setPasswordError(false);

    const data = new FormData(e.currentTarget);
    const username = data.get('username').trim();
    const password = data.get('password').trim();

    // input validation
    if (!username || !password) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await axios.post(`${process.env.REACT_APP_API_PREFIX}/auth`, {
        username,
        password
      });
      setUserKey(data.key);
      setLoading(false);
    } catch {
      setPasswordError(true);
      setErrorMsg('Email or password is incorrect.');
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
              Admin Sign In
            </Typography>
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                fullWidth
                id="username"
                label="Username"
                name="username"
                autoComplete="username"
              />
              <TextField
                margin="normal"
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                error={passwordError}
                helperText={passwordError && errorMsg}
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
                Sign In
              </LoadingButton>
            </Box>
          </Stack>
        </Stack>
      </Container>
    </Modal>
  );
}
