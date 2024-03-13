import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getById, loadSiteData as loadSiteData } from '../firebase';

import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Modal from '@mui/material/Modal';
import Container from '@mui/material/Container';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

export default function Site() {
  const { id } = useParams();
  const [site, setSite] = useState(null);
  const [data, setData] = useState([]);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      if (!site || site.id !== id) {
        const s = await getById('sites', id);
        if (!s) return;
        setSite(s);

        setData(await loadSiteData(id));
      }
    };

    try {
      fetchData();
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
            <TableContainer component={Paper}>
              <Table sx={{ minWidth: 650 }} size="small" aria-label="a dense table">
                <TableBody>
                  <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell variant="head">Time</TableCell>
                    {data.map((d) => (
                      <TableCell key={d.time.seconds} align="center">
                        {d.time.toDate().getHours().toString().padStart(2, '0') +
                          ':' +
                          d.time.toDate().getMinutes().toString().padStart(2, '0')}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell variant="head">Average</TableCell>
                    {data.map((d) => (
                      <TableCell key={d.time.seconds} align="center">
                        {d.windAverage}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell variant="head">Gust</TableCell>
                    {data.map((d) => (
                      <TableCell key={d.time.seconds} align="center">
                        {d.windGust}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell variant="head">Direction</TableCell>
                    {data.map((d) => (
                      <TableCell key={d.time.seconds} align="center">
                        {d.windBearing.toString().padStart(3, '0')}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </Stack>
      </Container>
    </Modal>
  );
}
