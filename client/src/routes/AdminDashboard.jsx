import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';

import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';

export default function AdminDashboard() {
  const { setUserKey } = useContext(AppContext);
  const navigate = useNavigate();
  function handleClose() {
    navigate('/');
  }

  async function handleSignOut() {
    try {
      setUserKey(null);
      navigate('/');
    } catch (error) {
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
            <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
              Dashboard
            </Typography>
            <Button
              variant="contained"
              onClick={() => {
                navigate('../admin/add-station');
              }}
              sx={{ width: '180px', mb: 1 }}
            >
              Add New Station
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                navigate('../admin/add-webcam');
              }}
              sx={{ width: '180px', mb: 1 }}
            >
              Add New Webcam
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                navigate('../admin/errors');
              }}
              sx={{ width: '180px' }}
            >
              View Errors
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Modal>
  );
}
