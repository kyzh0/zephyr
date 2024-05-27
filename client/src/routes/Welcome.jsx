import { useNavigate } from 'react-router-dom';
import { useCookies } from 'react-cookie';

import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Modal from '@mui/material/Modal';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';

import GridViewIcon from '@mui/icons-material/GridView';
import SsidChartIcon from '@mui/icons-material/SsidChart';

export default function Welcome() {
  const navigate = useNavigate();
  const [cookies, setCookies] = useCookies(); // eslint-disable-line

  function handleClose() {
    setCookies('visited', true, {
      path: '/',
      maxAge: 31536000, // 365 days
      secure: true,
      sameSite: 'strict'
    });
    navigate('/');
  }

  const bigScreen = window.matchMedia('(min-height: 360px)').matches;
  return (
    <Modal open disableAutoFocus={true}>
      <Container component="main" maxWidth="lg" sx={{ height: '100%' }}>
        <Stack direction="column" justifyContent="center" sx={{ height: '100%' }}>
          <Stack
            direction="column"
            alignItems="center"
            sx={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px' }}
          >
            <Box sx={{ mt: bigScreen ? 1 : 0, mb: bigScreen ? 2 : 0 }}>
              <img src="/logo192.png" style={{ width: '100px', height: '100px' }} />
            </Box>
            <Typography component="h1" variant="h5">
              Welcome to Zephyr
            </Typography>

            <Grid
              container
              spacing={bigScreen ? 1 : 0}
              sx={{ mt: bigScreen ? 1 : 0, fontFamily: 'Arial', fontWeight: 400, fontSize: '14px' }}
            >
              <Grid item xs={2} sm={1} order={{ xs: 1, sm: 1 }}>
                <Stack
                  direction="row"
                  justifyContent="end"
                  alignItems="center"
                  sx={{ height: '100%' }}
                >
                  <img
                    src="/arrow-yellow.png"
                    style={{ width: '25px', height: '36px', transform: 'rotate(315deg)' }}
                  />
                </Stack>
              </Grid>
              <Grid item xs={10} sm={5} order={{ xs: 2, sm: 2 }}>
                <Stack
                  direction="row"
                  justifyContent="center"
                  alignItems="center"
                  sx={{ height: '100%', textAlign: 'center' }}
                >
                  Click a station for details
                </Stack>
              </Grid>
              <Grid item xs={2} sm={1} order={{ xs: 3, sm: 5 }}>
                <Stack
                  direction="row"
                  justifyContent="end"
                  alignItems="center"
                  sx={{ height: '100%' }}
                >
                  <img
                    src="/gold-arrow-green.png"
                    style={{ width: '25px', height: '36px', transform: 'rotate(315deg)' }}
                  />
                </Stack>
              </Grid>
              <Grid item xs={10} sm={5} order={{ xs: 4, sm: 6 }}>
                <Stack
                  direction="row"
                  justifyContent="center"
                  alignItems="center"
                  sx={{ height: '100%', textAlign: 'center' }}
                >
                  Popular sites are outlined
                </Stack>
              </Grid>
              <Grid item xs={2} sm={1} order={{ xs: 5, sm: 9 }}>
                <Stack
                  direction="row"
                  justifyContent="end"
                  alignItems="center"
                  sx={{ height: '100%' }}
                >
                  <img
                    src="/gold-valid-arrow-light-green.png"
                    style={{ width: '25px', height: '36px', transform: 'rotate(315deg)' }}
                  />
                </Stack>
              </Grid>
              <Grid item xs={10} sm={5} order={{ xs: 6, sm: 10 }}>
                <Stack
                  direction="row"
                  justifyContent="center"
                  alignItems="center"
                  sx={{ height: '100%', textAlign: 'center' }}
                >
                  A green tail indicates the wind
                  <br />
                  direction may be favourable
                </Stack>
              </Grid>
              <Grid item xs={2} sm={1} order={{ xs: 7, sm: 3 }}>
                <Stack
                  direction="row"
                  justifyContent="end"
                  alignItems="center"
                  sx={{ height: '100%', mt: 1 }}
                >
                  <img src="/camera.png" style={{ width: '32px', height: '20px' }} />
                </Stack>
              </Grid>
              <Grid item xs={10} sm={5} order={{ xs: 8, sm: 4 }}>
                <Stack
                  direction="row"
                  justifyContent="center"
                  alignItems="center"
                  sx={{ height: '100%', textAlign: 'center', mt: 1 }}
                >
                  Click this icon to view webcams
                </Stack>
              </Grid>
              <Grid item xs={2} sm={1} order={{ xs: 9, sm: 7 }}>
                <Stack
                  direction="row"
                  justifyContent="end"
                  alignItems="center"
                  sx={{ height: '100%', mt: 1 }}
                >
                  <GridViewIcon sx={{ width: '32px', height: '20px' }} />
                </Stack>
              </Grid>
              <Grid item xs={10} sm={5} order={{ xs: 10, sm: 8 }}>
                <Stack
                  direction="row"
                  justifyContent="center"
                  alignItems="center"
                  sx={{ height: '100%', textAlign: 'center', mt: 1, pl: 2 }}
                >
                  Click for a live grid view of nearby
                  <br />
                  stations. Enable location permissions.
                </Stack>
              </Grid>
              <Grid item xs={2} sm={1} order={{ xs: 11, sm: 11 }}>
                <Stack
                  direction="row"
                  justifyContent="end"
                  alignItems="center"
                  sx={{ height: '100%', mt: 1 }}
                >
                  <SsidChartIcon
                    sx={{ width: '32px', height: '20px', transform: 'rotate(270deg)' }}
                  />
                </Stack>
              </Grid>
              <Grid item xs={10} sm={5} order={{ xs: 12, sm: 12 }}>
                <Stack
                  direction="row"
                  justifyContent="center"
                  alignItems="center"
                  sx={{ height: '100%', textAlign: 'center', mt: 1, pl: 2 }}
                >
                  Click for RASP Skew-T soundings
                </Stack>
              </Grid>
            </Grid>

            <Stack direction="row-reverse" sx={{ width: '100%', mt: bigScreen ? 2 : 0 }}>
              <Button variant="contained" onClick={handleClose}>
                OK
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </Modal>
  );
}
