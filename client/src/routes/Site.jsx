import React, { useEffect, useRef, useState } from 'react';
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
import Box from '@mui/material/Box';

import arrow from '../images/arrow.png';

function getWindColor(wind) {
  if (wind <= 2) {
    return '';
  } else if (wind <= 4) {
    return '#d1f9ff';
  } else if (wind <= 6) {
    return '#b5fffe';
  } else if (wind <= 8) {
    return '#a8ffec';
  } else if (wind <= 10) {
    return '#a8ffe2';
  } else if (wind <= 12) {
    return '#a8ffd1';
  } else if (wind <= 14) {
    return '#a8ffc2';
  } else if (wind <= 16) {
    return '#a8ffb1';
  } else if (wind <= 18) {
    return '#abffa8';
  } else if (wind <= 20) {
    return '#95ff91';
  } else if (wind <= 22) {
    return '#87ff82';
  } else if (wind <= 24) {
    return '#9dff82';
  } else if (wind <= 26) {
    return '#c3ff82';
  } else if (wind <= 28) {
    return '#e2ff82';
  } else if (wind <= 30) {
    return '#fff582';
  } else if (wind <= 32) {
    return '#ffda82';
  } else if (wind <= 34) {
    return '#ff9966';
  } else if (wind <= 36) {
    return '#ff8766';
  } else if (wind <= 38) {
    return '#ff7d66';
  } else if (wind <= 40) {
    return '#ff6666';
  } else if (wind <= 42) {
    return '#ff4d4d';
  } else if (wind <= 50) {
    return '#ff365e';
  } else if (wind <= 60) {
    return '#ff3683';
  } else if (wind <= 70) {
    return '#ff36a8';
  } else if (wind <= 80) {
    return '#ff36c6';
  } else if (wind <= 90) {
    return '#ff36e1';
  } else {
    return '#f536ff';
  }
}

function getWindDirection(bearing) {
  if (bearing <= 0) {
    return '';
  } else if (bearing <= 11.25) {
    return 'N';
  } else if (bearing <= 33.75) {
    return 'NNE';
  } else if (bearing <= 56.25) {
    return 'NE';
  } else if (bearing <= 78.75) {
    return 'ENE';
  } else if (bearing <= 101.25) {
    return 'E';
  } else if (bearing <= 123.75) {
    return 'ESE';
  } else if (bearing <= 146.25) {
    return 'SE';
  } else if (bearing <= 168.75) {
    return 'SSE';
  } else if (bearing <= 191.25) {
    return 'S';
  } else if (bearing <= 213.75) {
    return 'SSW';
  } else if (bearing <= 236.25) {
    return 'SW';
  } else if (bearing <= 258.75) {
    return 'WSW';
  } else if (bearing <= 281.25) {
    return 'W';
  } else if (bearing <= 303.75) {
    return 'WNW';
  } else if (bearing <= 326.25) {
    return 'NW';
  } else if (bearing <= 348.75) {
    return 'NNW';
  } else {
    return 'N';
  }
}

export default function Site() {
  const { id } = useParams();
  const [site, setSite] = useState(null);
  const [data, setData] = useState([]);
  const tableRef = useRef(null);

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

  useEffect(() => {
    if (tableRef.current) {
      tableRef.current.querySelector('tbody td:last-child').scrollIntoView();
    }
  }, [data]);

  const navigate = useNavigate();
  function handleClose() {
    navigate('/');
  }

  return (
    <Modal open onClose={handleClose}>
      <Container component="main" maxWidth="xl" sx={{ height: '100%' }}>
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
            <Typography component="h1" variant="h5">
              {site?.name}
            </Typography>
            <Typography variant="body2" gutterBottom>
              Elevation {site?.elevation}m
            </Typography>
            <TableContainer component={Paper}>
              <Table sx={{ minWidth: 650 }} size="small" aria-label="a dense table">
                <TableBody>
                  <TableRow
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    ref={tableRef}
                  >
                    <TableCell variant="head"></TableCell>
                    {data.slice(Math.max(data.length - 37, 0)).map((d) => (
                      <TableCell
                        key={d.time.seconds}
                        align="center"
                        sx={{
                          padding: '2px',
                          fontSize: '12px',
                          backgroundColor: d.time.toDate().getMinutes() == 0 ? '#e6e6e6' : ''
                        }}
                      >
                        {`${d.time.toDate().getHours().toString().padStart(2, '0')}:${d.time.toDate().getMinutes().toString().padStart(2, '0')}`}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell variant="head">Avg</TableCell>
                    {data.slice(Math.max(data.length - 37, 0)).map((d) => (
                      <TableCell
                        key={d.time.seconds}
                        align="center"
                        sx={{
                          padding: '2px',
                          backgroundColor: getWindColor(d.windAverage)
                        }}
                      >
                        {d.windAverage}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell variant="head">Gust</TableCell>
                    {data.slice(Math.max(data.length - 37, 0)).map((d) => (
                      <TableCell
                        key={d.time.seconds}
                        align="center"
                        sx={{
                          padding: '2px',
                          backgroundColor: getWindColor(d.windGust)
                        }}
                      >
                        {d.windGust}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell variant="head" sx={{ borderBottom: 'none' }}></TableCell>
                    {data.slice(Math.max(data.length - 37, 0)).map((d) => (
                      <TableCell
                        key={d.time.seconds}
                        align="center"
                        sx={{ padding: '2px', borderBottom: 'none' }}
                      >
                        {getWindDirection(d.windBearing)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell variant="head" sx={{ borderBottom: 'none' }}></TableCell>
                    {data.slice(Math.max(data.length - 37, 0)).map((d) => (
                      <TableCell
                        key={d.time.seconds}
                        align="center"
                        sx={{ padding: 0, borderBottom: 'none' }}
                      >
                        <Stack direction="column" justifyContent="center" alignItems="center">
                          <Box
                            component="img"
                            sx={{
                              width: '16px',
                              height: '16px',
                              transform: `rotate(${d.windBearing}deg)`
                            }}
                            src={arrow}
                          />
                        </Stack>
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell variant="head"></TableCell>
                    {data.slice(Math.max(data.length - 37, 0)).map((d) => (
                      <TableCell
                        key={d.time.seconds}
                        align="center"
                        sx={{ padding: '2px', fontSize: '10px' }}
                      >
                        {`${d.windBearing.toString().padStart(3, '0')}°`}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            <Stack direction="row" justifyContent="end" sx={{ width: '100%', pt: '4px' }}>
              <Typography variant="subtitle2">Source: {site?.type.toUpperCase()}</Typography>
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </Modal>
  );
}
