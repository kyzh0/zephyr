import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import LoadingButton from '@mui/lab/LoadingButton';
import CloseIcon from '@mui/icons-material/Close';

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
      console.log(error);
    }
  }

  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e) {
    if (loading) {
      return;
    }

    e.preventDefault();
    setLoading(true);

    setErrorMsg('');
    setPasswordError(false);

    const data = new FormData(e.currentTarget);
    const email = data.get('email').trim();
    const password = data.get('password').trim();

    // input validation
    if (!email || !password) {
      setLoading(false);
      return;
    }

    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      console.log(user);

      setLoading(false);
    } catch {
      setPasswordError(true);
      setErrorMsg('Email or password is incorrect.');
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
                margin="normal"
                fullWidth
                id="email"
                label="Email"
                name="email"
                autoComplete="email"
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
