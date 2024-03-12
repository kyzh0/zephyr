import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getById } from '../firebase';

import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Modal from '@mui/material/Modal';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';

export default function Site() {
  const { id } = useParams();
  const [site, setSite] = useState(null);

  useEffect(() => {
    if (!id) return;

    const fetchSite = async () => {
      if (!site || site.id !== id) {
        const s = await getById('sites', id);
        if (!s) return;
        setSite(s);
      }
    };

    try {
      fetchSite();
    } catch (error) {
      console.log(error);
    }
  }, [id]);

  const navigate = useNavigate();
  function handleClose() {
    navigate('/');
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
            <Stack direction="row-reverse" sx={{ width: '100%' }}>
              <IconButton sx={{ p: 0 }} onClick={handleClose}>
                <CloseIcon />
              </IconButton>
            </Stack>
            <Typography component="h1" variant="h5" gutterBottom>
              {site?.name}
            </Typography>
            <Typography variant="subtitle1">Source: {site?.type}</Typography>
            <Box component="form" noValidate sx={{ mt: 1 }}>
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
              />
            </Box>
          </Stack>
        </Stack>
      </Container>
    </Modal>
  );
}
