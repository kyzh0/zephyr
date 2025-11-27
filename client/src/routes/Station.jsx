import { useContext, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useCookies } from 'react-cookie';
import { formatInTimeZone } from 'date-fns-tz';
import { getStationById, loadStationData } from '../services/stationService';
import { AppContext } from '../context/AppContext';
import { getStationTypeName, getWindDirectionFromBearing, getWindColor } from '../lib/utils';

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

// WindCompass component
function WindCompass({ bearing, validBearings, scaling }) {
  const size = scaling * 180;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.4;

  // Parse valid bearings to create sectors
  const createValidBearingSectors = () => {
    if (!validBearings) {
      return [];
    }

    const sectors = [];
    const pairs = validBearings.split(',');

    for (const pair of pairs) {
      const bearings = pair.split('-');
      if (bearings.length === 2) {
        const start = Number(bearings[0]);
        const end = Number(bearings[1]);

        if (start <= end) {
          // Normal case: start to end
          sectors.push({ start, end });
        } else {
          // Wrapping case: start to 360, then 0 to end
          sectors.push({ start, end: 360 });
          sectors.push({ start: 0, end });
        }
      }
    }
    return sectors;
  };

  const createSectorPath = (startAngle, endAngle) => {
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');
  };

  const validSectors = createValidBearingSectors();

  return (
    <svg width={size} height={size} style={{ overflow: 'visible' }}>
      {/* Background circle */}
      <circle cx={centerX} cy={centerY} r={radius} fill="#c4ebfa" stroke="#333" strokeWidth="2" />

      {/* Valid bearing sectors */}
      {validSectors.map((sector, index) => (
        <path
          key={index}
          d={createSectorPath(sector.start, sector.end)}
          fill="rgba(34, 139, 34, 0.46)"
          stroke="none"
        />
      ))}

      {/* Compass marks */}
      {[0, 90, 180, 270].map((angle) => {
        const rad = ((angle - 90) * Math.PI) / 180;
        const x1 = centerX + (radius - 8) * Math.cos(rad);
        const y1 = centerY + (radius - 8) * Math.sin(rad);
        const x2 = centerX + radius * Math.cos(rad);
        const y2 = centerY + radius * Math.sin(rad);

        return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#333" strokeWidth="2" />;
      })}

      {/* Cardinal direction labels */}
      {[
        { angle: 0, label: 'N' },
        { angle: 90, label: 'E' },
        { angle: 180, label: 'S' },
        { angle: 270, label: 'W' }
      ].map(({ angle, label }) => {
        const rad = ((angle - 90) * Math.PI) / 180;
        const x = centerX + (radius + 15) * Math.cos(rad);
        const y = centerY + (radius + 15) * Math.sin(rad);

        return (
          <text
            key={angle}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={scaling * 14}
            fontWeight="bold"
            fill="#333"
          >
            {label}
          </text>
        );
      })}

      {/* Wind direction arrow */}
      {bearing != null && (
        <g>
          {(() => {
            // Calculate position at edge of circle
            const bearingRad = ((bearing - 90) * Math.PI) / 180;
            const edgeX = centerX + radius * Math.cos(bearingRad);
            const edgeY = centerY + radius * Math.sin(bearingRad);

            return (
              <g transform={`translate(${edgeX}, ${edgeY}) rotate(${bearing + 180})`}>
                <polygon
                  points="0,-20 5,5 0,0 -5,5"
                  fill="#FFD700"
                  stroke="#333"
                  strokeWidth="1"
                  transform={`scale(${scaling * 3})`}
                />
              </g>
            );
          })()}
        </g>
      )}
      <circle cx={centerX} cy={centerY} r="3" fill="#333" />
    </svg>
  );
}

WindCompass.propTypes = {
  bearing: PropTypes.number,
  validBearings: PropTypes.string,
  windSpeed: PropTypes.number,
  temperature: PropTypes.number,
  scaling: PropTypes.number.isRequired,
  cookies: PropTypes.object.isRequired
};

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
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshedStations } = useContext(AppContext);
  const [cookies] = useCookies();

  const [station, setStation] = useState(null);
  const [data, setData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [bearingPairCount, setBearingPairCount] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);
  const [hoveringOnInfoIcon, setHoveringOnInfoIcon] = useState(false);
  const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 });

  const tableRef = useRef(null);
  const modalRef = useRef(null);

  async function fetchData() {
    try {
      const s = await getStationById(id);
      if (!s) {
        navigate('/');
      }
      setStation(s);
      if (s.isOffline) {
        return;
      }

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

      const data = await loadStationData(id, s.isHighResolution);
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

      // show 36 records (last 6h) in table
      if (!s.isHighResolution) {
        setTableData(data.slice(Math.max(data.length - 37, 0)));
      }

      // calculate 10 min averages for high-res stations
      if (s.isHighResolution && data.length) {
        // interval starts at XX:X2
        let startIdx = 0;
        for (const d of data) {
          if (new Date(d.time).getMinutes() % 10 === 2) {
            break;
          }
          startIdx++;
        }

        const result = [];
        let sumAvg = 0;
        let sumBearingSin = 0;
        let sumBearingCos = 0;
        let sumTemperature = 0;
        let maxGust = null;
        let count = 0;
        let intervalStart = new Date(data[startIdx].time);
        for (let i = startIdx; i < data.length; i += 1) {
          const time = new Date(data[i].time);
          // handle missing readings
          if (
            time.getTime() - intervalStart.getTime() >= 10 * 60 * 1000 || // crossed 10min
            (time.getMinutes() % 10 > 0 && time.getMinutes() % 10 < intervalStart.getMinutes() % 10) // crossed XX:X0 mark
          ) {
            const avg = count > 0 ? Math.round(sumAvg / count) : null;
            const bearing =
              count > 0
                ? Math.round(Math.atan2(sumBearingSin, sumBearingCos) / (Math.PI / 180))
                : null;
            const temperature = count > 0 ? Math.round(sumTemperature / count) : null;
            result.push({
              time: new Date(
                intervalStart.getTime() + (10 - (intervalStart.getMinutes() % 10)) * 60 * 1000
              ).toISOString(),
              windAverage: avg,
              windGust: maxGust,
              windBearing: bearing < 0 ? bearing + 360 : bearing,
              temperature: temperature
            });
            intervalStart = time;
            count = 0;
            sumAvg = 0;
            sumBearingSin = 0;
            sumBearingCos = 0;
            sumTemperature = 0;
            maxGust = null;
          }

          if (data[i].windAverage != null) {
            count++;
            sumAvg += data[i].windAverage;
            if (data[i].windBearing != null) {
              sumBearingSin += Math.sin((data[i].windBearing * Math.PI) / 180);
              sumBearingCos += Math.cos((data[i].windBearing * Math.PI) / 180);
            }
            if (data[i].temperature != null) {
              sumTemperature += data[i].temperature;
            }
            if (data[i].windGust != null && data[i].windGust > maxGust) {
              maxGust = data[i].windGust;
            }
          }

          // calculate average at XX:X0
          // latest (incomplete) interval is ignored
          if (time.getMinutes() % 10 === 0) {
            const avg = count > 0 ? Math.round(sumAvg / count) : null;
            const bearing =
              count > 0
                ? Math.round(Math.atan2(sumBearingSin, sumBearingCos) / (Math.PI / 180))
                : null;
            const temperature = count > 0 ? Math.round(sumTemperature / count) : null;
            result.push({
              time: time.toISOString(),
              windAverage: avg,
              windGust: maxGust,
              windBearing: bearing < 0 ? bearing + 360 : bearing,
              temperature: temperature
            });
            count = 0;
            sumAvg = 0;
            sumBearingSin = 0;
            sumBearingCos = 0;
            sumTemperature = 0;
            maxGust = null;
            if (i < data.length - 1) {
              intervalStart = new Date(data[i + 1].time);
            }
          }
        }

        for (const item of result) {
          item.timeLabel = formatInTimeZone(new Date(item.time), 'Pacific/Auckland', 'HH:mm');
          item.windAverageKt =
            item.windAverage == null ? null : Math.round(item.windAverage / 1.852);
          item.windGustKt = item.windGust == null ? null : Math.round(item.windGust / 1.852);
        }

        // show 36 records (last 6h) in table
        setTableData(result.slice(Math.max(result.length - 37, 0)));
      }
    } catch (error) {
      console.error(error);
    }
  }

  // initial load
  useEffect(() => {
    if (!id) {
      return;
    }

    try {
      setInitialLoad(false);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  }, [id]);

  // on refresh trigger (ignore initial load)
  useEffect(() => {
    if (!id || initialLoad || !refreshedStations || !refreshedStations.includes(id)) {
      return;
    }

    try {
      fetchData();
    } catch (error) {
      console.error(error);
    }
  }, [id, refreshedStations]);

  useEffect(() => {
    if (!tableRef.current) {
      return;
    }
    tableRef.current.querySelector('tbody td:last-child').scrollIntoView();

    if (!modalRef.current) {
      return;
    }
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
    <Modal open onClose={handleClose} disableAutoFocus={true} style={{ padding: 4 }}>
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
              overflowY: 'scroll',
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
                <Typography
                  component="h1"
                  variant="body1"
                  gutterBottom
                  sx={{ mt: 2, color: '#ff4261' }}
                >
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
                      <WindCompass
                        bearing={station.currentBearing}
                        validBearings={station.validBearings}
                        scaling={scaling}
                      />
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
              ) : data && data.length && tableData && tableData.length ? (
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
                          {tableData.map((d) => (
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
                          {tableData.map((d) => (
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
                          {tableData.map((d) => (
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
                          {tableData.map((d) => (
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
                          {tableData.map((d) => (
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
                          {tableData.map((d) => (
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
                          {tableData.map((d) => (
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

            {station && (
              <Stack direction="row" justifyContent="space-between" sx={{ width: '100%' }}>
                <Stack direction="column" justifyContent="center" sx={{ height: '100%' }}>
                  <Typography variant="body2" sx={{ ...(!bigScreen && { fontSize: '10px' }) }}>
                    Updated{' '}
                    {formatInTimeZone(new Date(station.lastUpdate), 'Pacific/Auckland', 'HH:mm')}
                  </Typography>
                </Stack>
                <Link
                  href={station.externalLink}
                  target="_blank"
                  rel="noreferrer"
                  variant="subtitle2"
                >
                  Source: {getStationTypeName(station.type)}
                </Link>
              </Stack>
            )}
          </Stack>
        </Stack>
      </Container>
    </Modal>
  );
}
