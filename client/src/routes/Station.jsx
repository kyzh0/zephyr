import { useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useCookies } from 'react-cookie';
import { formatInTimeZone } from 'date-fns-tz';
import { getStationById, loadStationData } from '../services/stationService';
import { AppContext } from '../context/AppContext';
import { getStationTypeName, getWindDirectionFromBearing, getWindColor } from '../helpers/utils';

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
import { alpha } from '@mui/material';

function getDirectionColor(bearing, validBearings) {
  if (bearing != null && validBearings) {
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

export default function Station() {
  const { id } = useParams();
  const [station, setStation] = useState(null);
  const [data, setData] = useState([]);
  const [bearingPairCount, setBearingPairCount] = useState(0);
  const tableRef = useRef(null);
  const modalRef = useRef(null);
  const { refreshedStations } = useContext(AppContext);
  const [initialLoad, setInitialLoad] = useState(true);
  const [cookies] = useCookies();
  const [hoveringOnInfoIcon, setHoveringOnInfoIcon] = useState(false);
  const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 });

  async function fetchData() {
    try {
      const s = await getStationById(id);
      if (!s) navigate('/');
      setStation(s);
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

      const data = await loadStationData(id);
      data.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()); // time asc
      for (const d of data) {
        d.timeLabel = formatInTimeZone(new Date(d.time), 'Pacific/Auckland', 'HH:mm');
        d.windAverageKt = d.windAverage == null ? null : Math.round(d.windAverage / 1.852);
        d.windGustKt = d.windGust == null ? null : Math.round(d.windGust / 1.852);
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
    if (!id || initialLoad || !refreshedStations || !refreshedStations.includes(id)) return;

    try {
      fetchData();
    } catch (error) {
      console.error(error);
    }
  }, [id, refreshedStations]);

  useEffect(() => {
    if (!tableRef.current) return;
    tableRef.current.querySelector('tbody td:last-child').scrollIntoView();

    if (!modalRef.current) return;
    modalRef.current.scroll(0, 0);
  }, [data]);

  useEffect(() => {
    const handleWindowMouseMove = (event) => {
      setMouseCoords({
        x: event.clientX,
        y: event.clientY
      });
    };
    window.addEventListener('mousemove', handleWindowMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
    };
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  function handleClose() {
    if (location.key === 'default') {
      navigate('/');
    } else {
      navigate(-1);
    }
  }

  const bigScreen = window.matchMedia('(min-height: 720px)').matches;
  const tinyScreen = window.matchMedia('(max-height: 530px)').matches;
  const scaling = bigScreen ? 1 : tinyScreen ? 0.5 : 0.65;
  return (
    <Modal open onClose={handleClose} disableAutoFocus={true}>
      <Container
        component="main"
        maxWidth="xl"
        sx={{ height: '100%' }}
        onClick={() => setHoveringOnInfoIcon(false)}
      >
        {hoveringOnInfoIcon && (
          <Paper
            sx={{
              bgcolor: '#fff8fd',
              position: 'absolute',
              top: mouseCoords.y + 20,
              left: mouseCoords.x,
              minWidth: '40vh',
              transform: 'translateX(-70%)',
              zIndex: 100,
              p: 4 * scaling
            }}
          >
            <Typography
              component="h1"
              variant="h5"
              align="center"
              fontWeight="bold"
              fontSize="18px"
              gutterBottom
            >
              INFO
            </Typography>
            <Typography variant="body2" align="center">
              {station.popupMessage}
            </Typography>
          </Paper>
        )}
        <Stack direction="column" justifyContent="center" sx={{ height: '100%' }}>
          <Stack
            direction="column"
            alignItems="center"
            sx={{
              ...(tinyScreen && { overflowY: 'scroll' }),
              backgroundColor: 'white',
              padding: bigScreen ? '24px' : '12px',
              borderRadius: '8px'
            }}
            ref={modalRef}
          >
            <Stack direction="row" sx={{ width: '100%' }}>
              <Stack direction="column" alignItems="center" sx={{ width: '100%', ml: 3 }}>
                {station ? (
                  <>
                    <Typography
                      component="h1"
                      variant="h5"
                      align="center"
                      sx={{ ...(!bigScreen && { fontSize: '18px' }) }}
                    >
                      {station.name}
                    </Typography>
                    <Typography variant="body2" sx={{ ...(!bigScreen && { fontSize: '12px' }) }}>
                      Elevation {station.elevation}m
                    </Typography>
                  </>
                ) : (
                  <Skeleton
                    width="180px"
                    height={`${scaling * 50}px`}
                    sx={{ backgroundColor: alpha('#a8a8a8', 0.1), transform: 'none' }}
                  />
                )}
              </Stack>
              <IconButton sx={{ p: 0, width: '24px', height: '24px' }} onClick={handleClose}>
                <CloseIcon />
              </IconButton>
            </Stack>
            {station ? (
              station.isOffline ? (
                <Typography component="h1" variant="h5" sx={{ mt: 2, color: 'red' }}>
                  Station is offline.
                </Typography>
              ) : (
                <Stack
                  direction="row"
                  justifyContent="center"
                  sx={{ width: '100%', p: bigScreen ? '6px' : '2px', pb: '10px' }}
                >
                  {station.currentBearing != null &&
                    (station.currentAverage != null || station.currentGust != null) && (
                      <Stack direction="column" justifyContent="center" alignItems="center">
                        <Typography
                          variant="h5"
                          sx={{
                            fontSize: `${scaling * 16}px`,
                            mb: 1
                          }}
                        >
                          {getWindDirectionFromBearing(station.currentBearing)}
                        </Typography>
                        <Stack
                          direction="row"
                          justifyContent="center"
                          alignItems="center"
                          sx={{
                            p: `${scaling * 8}px`,
                            background: getDirectionColor(
                              station.currentAverage == null && station.currentGust == null
                                ? null
                                : station.currentBearing,
                              station.validBearings
                            )
                          }}
                        >
                          <img
                            src="/arrow.png"
                            style={{
                              width: `${scaling * 48}px`,
                              height: `${scaling * 48}px`,
                              transform: `rotate(${Math.round(station.currentBearing)}deg)`
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
                            fontSize: tinyScreen ? '18px' : '24px',
                            backgroundColor: getWindColor(station.currentAverage),
                            borderBottom: 'none',
                            p: bigScreen ? 1 : 0
                          }}
                        >
                          {station.currentAverage == null
                            ? '-'
                            : Math.round(
                                cookies.unit === 'kt'
                                  ? station.currentAverage / 1.852
                                  : station.currentAverage
                              )}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            fontSize: tinyScreen ? '18px' : '24px',
                            backgroundColor: getWindColor(station.currentGust),
                            borderBottom: 'none',
                            p: bigScreen ? 1 : 0
                          }}
                        >
                          {station.currentGust == null
                            ? '-'
                            : Math.round(
                                cookies.unit === 'kt'
                                  ? station.currentGust / 1.852
                                  : station.currentGust
                              )}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            fontSize: tinyScreen ? '14px' : '16px',
                            borderBottom: 'none',
                            p: 0
                          }}
                        >
                          {station.currentTemperature == null
                            ? ''
                            : `${Math.round(station.currentTemperature * 10) / 10}°C`}
                        </TableCell>
                        {station.popupMessage && (
                          <TableCell
                            align="center"
                            sx={{
                              borderBottom: 'none',
                              p: 0,
                              pl: 1 * scaling
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setHoveringOnInfoIcon(!hoveringOnInfoIcon);
                            }}
                            onMouseOver={() => setHoveringOnInfoIcon(true)}
                            onMouseOut={() => setHoveringOnInfoIcon(false)}
                          >
                            <img
                              src="/caution.png"
                              style={{
                                width: `${scaling * 40}px`,
                                height: `${scaling * 40}px`,
                                opacity: hoveringOnInfoIcon ? 0.3 : 1
                              }}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                      <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0, p: 0 } }}>
                        <TableCell
                          colSpan={2}
                          align="center"
                          sx={{
                            fontSize: '10px'
                          }}
                        >
                          {cookies.unit === 'kt' ? 'kt' : 'km/h'}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Stack>
              )
            ) : (
              <Skeleton
                width="100%"
                height={`${scaling * 110}px`}
                sx={{ backgroundColor: alpha('#a8a8a8', 0.1), transform: 'none', mb: 2, mt: 2 }}
              />
            )}
            {station ? (
              station.isOffline ? (
                <></>
              ) : data && data.length ? (
                <>
                  <TableContainer
                    component={Paper}
                    sx={{ ...(tinyScreen && { minHeight: '122px' }) }}
                  >
                    <Table sx={{ minWidth: '650px' }} size="small">
                      <TableBody>
                        <TableRow
                          sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                          ref={tableRef}
                        >
                          <TableCell variant="head"></TableCell>
                          {data.slice(Math.max(data.length - 37, 0)).map((d) => (
                            <TableCell
                              key={d.time}
                              align="center"
                              sx={{
                                padding: bigScreen ? '2px' : '0px 2px 0px 2px',
                                fontSize: tinyScreen ? '10px' : '12px',
                                backgroundColor: new Date(d.time).getMinutes() == 0 ? '#e6e6e6' : ''
                              }}
                            >
                              {d.timeLabel}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell
                            variant="head"
                            sx={{
                              ...(tinyScreen && { fontSize: '12px' }),
                              padding: bigScreen ? '2px' : '0px 0px 0px 2px'
                            }}
                          >
                            Avg
                          </TableCell>
                          {data.slice(Math.max(data.length - 37, 0)).map((d) => (
                            <TableCell
                              key={d.time}
                              align="center"
                              sx={{
                                ...(tinyScreen && { fontSize: '12px' }),
                                padding: bigScreen ? '2px' : '0px',
                                backgroundColor: getWindColor(d.windAverage)
                              }}
                            >
                              {d.windAverage == null
                                ? '-'
                                : Math.round(
                                    cookies.unit === 'kt' ? d.windAverage / 1.852 : d.windAverage
                                  )}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell
                            variant="head"
                            sx={{
                              ...(tinyScreen && { fontSize: '12px' }),
                              padding: bigScreen ? '2px' : '0px 0px 0px 2px'
                            }}
                          >
                            Gust
                          </TableCell>
                          {data.slice(Math.max(data.length - 37, 0)).map((d) => (
                            <TableCell
                              key={d.time}
                              align="center"
                              sx={{
                                ...(tinyScreen && { fontSize: '12px' }),
                                padding: bigScreen ? '2px' : '0px',
                                backgroundColor: getWindColor(d.windGust)
                              }}
                            >
                              {d.windGust == null
                                ? '-'
                                : Math.round(
                                    cookies.unit === 'kt' ? d.windGust / 1.852 : d.windGust
                                  )}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell variant="head" sx={{ borderBottom: 'none' }}></TableCell>
                          {data.slice(Math.max(data.length - 37, 0)).map((d) => (
                            <TableCell
                              key={d.time}
                              align="center"
                              sx={{
                                ...(tinyScreen && { fontSize: '10px' }),
                                padding: bigScreen ? '2px' : '0px',
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
                              key={d.time}
                              align="center"
                              sx={{
                                padding: 0,
                                borderBottom: 'none',
                                background: getDirectionColor(
                                  d.windAverage == null && d.windGust == null
                                    ? null
                                    : d.windBearing,
                                  station.validBearings
                                )
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
                              key={d.time}
                              align="center"
                              sx={{
                                padding: bigScreen ? '2px' : '0px',
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
                              key={d.time}
                              align="center"
                              sx={{
                                padding: bigScreen ? '2px' : '0px',
                                fontSize: tinyScreen ? '8px' : '10px'
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
                      minHeight: '120px',
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
                          dataKey={cookies.unit === 'kt' ? 'windAverageKt' : 'windAverage'}
                          name={`Avg (${cookies.unit === 'kt' ? 'kt' : 'km/h'})`}
                          stroke="#8884d8"
                          dot={{ r: 0 }}
                          activeDot={{ r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey={cookies.unit === 'kt' ? 'windGustKt' : 'windGust'}
                          name={`Gust (${cookies.unit === 'kt' ? 'kt' : 'km/h'})`}
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
                      minHeight: '120px'
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
                <Skeleton
                  width="100%"
                  height={`${scaling * 540}px`}
                  sx={{ backgroundColor: alpha('#a8a8a8', 0.1), transform: 'none', mb: 2 }}
                />
              )
            ) : (
              <Skeleton
                width="100%"
                height={`${scaling * 540}px`}
                sx={{ backgroundColor: alpha('#a8a8a8', 0.1), transform: 'none', mb: 2 }}
              />
            )}

            <Stack direction="row" justifyContent="end" sx={{ width: '100%' }}>
              {station && (
                <Link
                  href={station.externalLink}
                  target="_blank"
                  rel="noreferrer"
                  variant="subtitle2"
                >
                  Source: {getStationTypeName(station.type)}
                </Link>
              )}
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </Modal>
  );
}
