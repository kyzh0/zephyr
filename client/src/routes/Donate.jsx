import { useNavigate } from 'react-router-dom';

import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Modal from '@mui/material/Modal';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

export default function Donate() {
  const navigate = useNavigate();

  function handleClose() {
    navigate('/');
  }

  return (
    <Modal open disableAutoFocus={true}>
      <Container component="main" maxWidth="lg" sx={{ height: '100%' }}>
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
              Donate
            </Typography>
            <Typography component="p" variant="body2" textAlign="center" gutterBottom>
              Zephyr will always be free and available for the New Zealand free-flying community.
            </Typography>
            <Typography component="p" variant="body2" textAlign="center" gutterBottom>
              However, any donations are appreciated and will go towards ongoing website costs and
              maintenance.
            </Typography>
            <Typography component="p" variant="body2" textAlign="center" gutterBottom>
              If you like, you can make a contribution to the following bank account:
            </Typography>
            <Stack
              direction="row"
              justifyContent="center"
              alignItems="center"
              sx={{ width: '100%' }}
            >
              <Typography component="p" variant="body1" textAlign="center">
                {process.env.REACT_APP_DONATION_BANK_ACCOUNT}
              </Typography>
              <IconButton
                sx={{ ml: 2, width: '20px', height: '20px' }}
                onClick={async () =>
                  await navigator.clipboard.writeText(process.env.REACT_APP_DONATION_BANK_ACCOUNT)
                }
              >
                <ContentCopyIcon sx={{ width: '16px', height: '16px' }} />
              </IconButton>
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </Modal>
  );
}
