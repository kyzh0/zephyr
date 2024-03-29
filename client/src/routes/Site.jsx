import { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSiteById, loadSiteData as loadSiteData } from '../firebase';
import { AppContext } from '../context/AppContext';
import { getWindDirectionFromBearing } from '../helpers/utils';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area
} from 'recharts';

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
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import styled from '@emotion/styled';
import { alpha } from '@mui/material';

function getWindColor(wind) {
  if (wind == null) {
    return '';
  } else if (wind <= 2) {
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

function getDirectionColor(bearing, validBearings) {
  if (validBearings) {
    const pairs = validBearings.split(',');
    for (const p of pairs) {
      const bearings = p.split('-');
      if (bearings.length == 2) {
        const bearing1 = Number(bearings[0]);
        const bearing2 = Number(bearings[1]);
        if (bearing1 <= bearing2) {
          if (bearing >= bearing1 && bearing <= bearing2) {
            return 'rgba(192, 255, 191, 0.5)';
          }
        } else {
          if (bearing >= bearing1 || bearing <= bearing2) {
            return 'rgba(192, 255, 191, 0.5)';
          }
        }
      }
    }
  }
  return '';
}

export default function Site() {
  const { id } = useParams();
  const [site, setSite] = useState(null);
  const [data, setData] = useState([]);
  const [bearingPairCount, setBearingPairCount] = useState(0);
  const tableRef = useRef(null);
  const { refreshedIds } = useContext(AppContext);
  const [initialLoad, setInitialLoad] = useState(true);

  async function fetchData() {
    try {
      const s = await getSiteById(id);
      if (!s) return;
      setSite(s);
      if (s.isOffline) return;

      const validBearings = [];
      const pairs = s.validBearings ? s.validBearings.split(',') : [];
      for (const p of pairs) {
        const temp = p.split('-');
        const b1 = Number(temp[0]);
        const b2 = Number(temp[1]);
        if (b1 <= b2) {
          validBearings.push([b1, b2]);
        } else {
          validBearings.push([b1, 360]);
          validBearings.push([0, b2]);
        }
      }

      const data = await loadSiteData(id);
      data.sort((a, b) => parseFloat(a.time.seconds) - parseFloat(b.time.seconds)); // time asc
      for (const d of data) {
        d.timeLabel = `${d.time.toDate().getHours().toString().padStart(2, '0')}:${d.time.toDate().getMinutes().toString().padStart(2, '0')}`;
        if (validBearings.length) {
          setBearingPairCount(validBearings.length);
          for (let i = 0; i < validBearings.length; i++) {
            d[`validBearings${i}`] = validBearings[i];
          }
        }
      }
      setData(data);
    } catch (error) {
      console.error(error);
    }
  }

  // initial load
  useEffect(() => {
    if (!id) return;

    try {
      setInitialLoad(false);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  }, [id]);

  // on refresh trigger (ignore initial load)
  useEffect(() => {
    if (!id || initialLoad || !refreshedIds || !refreshedIds.includes(id)) return;

    try {
      fetchData();
    } catch (error) {
      console.error(error);
    }
  }, [id, refreshedIds]);

  useEffect(() => {
    if (!tableRef.current) return;
    tableRef.current.querySelector('tbody td:last-child').scrollIntoView();
  }, [data]);

  const navigate = useNavigate();
  function handleClose() {
    navigate('/');
  }

  const StyledSkeleton = styled(Skeleton)(() => ({
    backgroundColor: alpha('#a8a8a8', 0.1)
  }));

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
            {site ? (
              <Typography component="h1" variant="h5">
                {site.name}
              </Typography>
            ) : (
              <StyledSkeleton width={180} height={40} />
            )}
            {site ? (
              <Typography variant="body2">Elevation {site.elevation}m</Typography>
            ) : (
              <StyledSkeleton width={120} height={20} />
            )}
            {site ? (
              site.isOffline ? (
                <Typography component="h1" variant="h5" sx={{ mt: 2, color: 'red' }}>
                  Station is offline.
                </Typography>
              ) : (
                <Stack
                  direction="row"
                  justifyContent="center"
                  sx={{ width: '100%', p: '8px', pb: '18px' }}
                >
                  {site.currentBearing != null &&
                    (site.currentAverage != null || site.currentGust != null) && (
                      <Stack direction="column" justifyContent="center" alignItems="center">
                        <Typography
                          variant="h5"
                          sx={{
                            fontSize: '16px',
                            mb: 1
                          }}
                        >
                          {getWindDirectionFromBearing(site.currentBearing)}
                        </Typography>
                        <Stack
                          direction="row"
                          justifyContent="center"
                          alignItems="center"
                          sx={{
                            p: 1,
                            background: getDirectionColor(site.currentBearing, site.validBearings)
                          }}
                        >
                          <img
                            src="/arrow.png"
                            style={{
                              width: '48px',
                              height: '48px',
                              transform: `rotate(${Math.round(site.currentBearing)}deg)`
                            }}
                          />
                        </Stack>
                      </Stack>
                    )}
                  <Table sx={{ width: '180px', ml: 3 }}>
                    <TableBody>
                      <TableRow
                        sx={{
                          '&:last-child td, &:last-child th': { border: 0 }
                        }}
                      >
                        <TableCell
                          align="center"
                          sx={{ fontSize: '10px', borderBottom: 'none', p: 0 }}
                        >
                          Avg
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{ fontSize: '10px', borderBottom: 'none', p: 0 }}
                        >
                          Gust
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{ fontSize: '10px', borderBottom: 'none', p: 0 }}
                        ></TableCell>
                      </TableRow>
                      <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell
                          align="center"
                          sx={{
                            fontSize: '24px',
                            backgroundColor: getWindColor(site.currentAverage),
                            borderBottom: 'none',
                            p: 1
                          }}
                        >
                          {site.currentAverage == null ? '-' : Math.round(site.currentAverage)}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            fontSize: '24px',
                            backgroundColor: getWindColor(site.currentGust),
                            borderBottom: 'none',
                            p: 1
                          }}
                        >
                          {site.currentGust == null ? '-' : Math.round(site.currentGust)}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            fontSize: '16px',
                            borderBottom: 'none',
                            p: 0
                          }}
                        >
                          {site.currentTemperature == null
                            ? ''
                            : `${Math.round(site.currentTemperature * 10) / 10}°C`}
                        </TableCell>
                      </TableRow>
                      <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0, p: 0 } }}>
                        <TableCell
                          colSpan={2}
                          align="center"
                          sx={{
                            fontSize: '10px'
                          }}
                        >
                          km/h
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Stack>
              )
            ) : (
              <StyledSkeleton width={180} height={180} />
            )}
            {site ? (
              site.isOffline ? (
                <></>
              ) : data && data.length ? (
                <>
                  <TableContainer component={Paper}>
                    <Table sx={{ minWidth: 650 }} size="small">
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
                              {d.windAverage == null ? '-' : Math.round(d.windAverage)}
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
                              {d.windGust == null ? '-' : Math.round(d.windGust)}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell variant="head" sx={{ borderBottom: 'none' }}></TableCell>
                          {data.slice(Math.max(data.length - 37, 0)).map((d) => (
                            <TableCell
                              key={d.time.seconds}
                              align="center"
                              sx={{
                                padding: '2px',
                                borderBottom: 'none'
                              }}
                            >
                              {d.windBearing == null ||
                              (d.windAverage == null && d.windGust == null)
                                ? ''
                                : getWindDirectionFromBearing(d.windBearing)}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell variant="head" sx={{ borderBottom: 'none' }}></TableCell>
                          {data.slice(Math.max(data.length - 37, 0)).map((d) => (
                            <TableCell
                              key={d.time.seconds}
                              align="center"
                              sx={{
                                padding: 0,
                                borderBottom: 'none',
                                background: getDirectionColor(d.windBearing, site.validBearings)
                              }}
                            >
                              {d.windBearing == null ||
                              (d.windAverage == null && d.windGust == null) ? (
                                '-'
                              ) : (
                                <Stack
                                  direction="column"
                                  justifyContent="center"
                                  alignItems="center"
                                >
                                  <img
                                    src="/arrow.png"
                                    style={{
                                      width: '16px',
                                      height: '16px',
                                      transform: `rotate(${Math.round(d.windBearing)}deg)`
                                    }}
                                  />
                                </Stack>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell variant="head"></TableCell>
                          {data.slice(Math.max(data.length - 37, 0)).map((d) => (
                            <TableCell
                              key={d.time.seconds}
                              align="center"
                              sx={{
                                padding: '2px',
                                fontSize: '10px'
                              }}
                            >
                              {d.windBearing == null ||
                              (d.windAverage == null && d.windGust == null)
                                ? ''
                                : `${Math.round(d.windBearing).toString().padStart(3, '0')}°`}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell variant="head"></TableCell>
                          {data.slice(Math.max(data.length - 37, 0)).map((d) => (
                            <TableCell
                              key={d.time.seconds}
                              align="center"
                              sx={{
                                padding: '2px',
                                fontSize: '10px'
                              }}
                            >
                              {d.temperature == null
                                ? '-'
                                : `${Math.round(d.temperature * 10) / 10}°C`}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Box
                    sx={{
                      width: '100%',
                      height: '20vh',
                      mt: 2
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart width="100%" height="100%" data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="timeLabel"
                          tick={{ fill: 'black' }}
                          style={{
                            fontSize: '12px',
                            fontWeight: 400,
                            fontFamily: 'Arial'
                          }}
                        />
                        <YAxis
                          width={20}
                          interval={0}
                          tickCount={6}
                          tick={{ fill: 'black' }}
                          style={{
                            fontSize: '12px',
                            fontWeight: 400,
                            fontFamily: 'Arial'
                          }}
                        />
                        <Tooltip formatter={(value) => Math.round(value)} />
                        <Legend
                          wrapperStyle={{ fontSize: '12px', fontWeight: 400, fontFamily: 'Arial' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="windAverage"
                          name="Avg (km/h)"
                          stroke="#8884d8"
                          dot={{ r: 0 }}
                          activeDot={{ r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="windGust"
                          name="Gust (km/h)"
                          stroke="#ffa894"
                          dot={{ r: 0 }}
                          activeDot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                  <Box
                    sx={{
                      width: '100%',
                      height: '20vh',
                      mt: 2
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart width="100%" height="100%" data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="timeLabel"
                          tick={{ fill: 'black' }}
                          style={{
                            fontSize: '12px',
                            fontWeight: 400,
                            fontFamily: 'Arial'
                          }}
                        />
                        <YAxis
                          width={20}
                          interval={0}
                          ticks={[0, 90, 180, 270, 360]}
                          tickFormatter={(value) => {
                            switch (value) {
                              case 0:
                                return 'N';
                              case 90:
                                return 'E';
                              case 180:
                                return 'S';
                              case 270:
                                return 'W';
                              case 360:
                                return 'N';
                              default:
                                return '';
                            }
                          }}
                          tick={{ fill: 'black' }}
                          style={{
                            fontSize: '12px',
                            fontWeight: 400,
                            fontFamily: 'Arial'
                          }}
                        />
                        <Tooltip
                          formatter={(value, name) => [
                            name === 'vb' ? null : Math.round(value).toString().padStart(3, '0'),
                            name === 'vb' ? null : 'Bearing'
                          ]}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: '12px', fontWeight: 400, fontFamily: 'Arial' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="windBearing"
                          name="Direction"
                          stroke="#8884d8"
                          strokeWidth={0}
                          dot={{ r: 1, strokeWidth: 2 }}
                        />
                        {[...Array(bearingPairCount).keys()].map((i) => (
                          <Area
                            key={i}
                            type="monotone"
                            dataKey={`validBearings${i}`}
                            fill="rgba(192, 255, 191, 0.5)"
                            stroke="none"
                            activeDot={{ r: 0, stroke: 'none' }}
                            legendType="none"
                            name="vb"
                          />
                        ))}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Box>
                </>
              ) : (
                <StyledSkeleton width={'100%'} height={600} />
              )
            ) : (
              <StyledSkeleton width={'100%'} height={600} />
            )}

            <Stack direction="row" justifyContent="end" sx={{ width: '100%', pt: '4px' }}>
              {site && (
                <Link href={site.externalLink} target="_blank" rel="noreferrer" variant="subtitle2">
                  Source:{' '}
                  {site.type.length <= 4
                    ? site.type.toUpperCase()
                    : site.type.charAt(0).toUpperCase() + site.type.slice(1)}
                </Link>
              )}
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </Modal>
  );
}
