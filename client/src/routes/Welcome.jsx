import { useNavigate } from 'react-router-dom';
import { useCookies } from 'react-cookie';

import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Modal from '@mui/material/Modal';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';

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

  return (
    <Modal open disableAutoFocus={true}>
      <Container component="main" maxWidth="xs" sx={{ height: '100%' }}>
        <Stack direction="column" justifyContent="center" sx={{ height: '100%' }}>
          <Stack
            direction="column"
            alignItems="center"
            sx={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px' }}
          >
            <Box sx={{ mt: 1, mb: 2 }}>
              <img src="/logo192.png" style={{ width: '100px', height: '100px' }} />
            </Box>
            <Typography component="h1" variant="h5">
              Welcome to Zephyr
            </Typography>

            <Table sx={{ width: '100%', mt: 2 }}>
              <TableBody>
                <TableRow>
                  <TableCell align="center" sx={{ border: 'none', p: 0, width: '20%', pb: 1 }}>
                    <img
                      src="/arrow-yellow.png"
                      style={{ width: '25px', height: '36px', transform: 'rotate(315deg)' }}
                    />
                  </TableCell>
                  <TableCell align="center" sx={{ border: 'none', p: 0, pb: 1 }}>
                    Click a station for details
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell align="center" sx={{ border: 'none', p: 0, width: '20%', pb: 1 }}>
                    <img
                      src="/gold-arrow-green.png"
                      style={{ width: '25px', height: '36px', transform: 'rotate(315deg)' }}
                    />
                  </TableCell>
                  <TableCell align="center" sx={{ border: 'none', p: 0, pb: 1 }}>
                    Popular sites are outlined
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell align="center" sx={{ border: 'none', p: 0, width: '20%', pb: 1 }}>
                    <img
                      src="/gold-valid-arrow-light-green.png"
                      style={{ width: '25px', height: '36px', transform: 'rotate(315deg)' }}
                    />
                  </TableCell>
                  <TableCell align="center" sx={{ border: 'none', p: 0, pb: 1 }}>
                    A green tail indicates the wind
                    <br />
                    direction may be favourable
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Stack direction="row-reverse" sx={{ width: '100%', mt: 2 }}>
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
