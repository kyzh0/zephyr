import axios from 'axios';
import { formatInTimeZone } from 'date-fns-tz';
import fs from 'fs/promises';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

import logger from '../helpers/log.js';

import { Station } from '../models/stationModel.js';
import { Output } from '../models/outputModel.js';

function getFlooredTime() {
  // floor data timestamp to 10 min
  let date = new Date();
  let rem = date.getMinutes() % 10;
  if (rem > 0) date = new Date(date.getTime() - rem * 60 * 1000);
  rem = date.getSeconds() % 60;
  if (rem > 0) date = new Date(date.getTime() - rem * 1000);
  date = new Date(Math.floor(date.getTime() / 1000) * 1000);
  return date;
}

function getWindBearingFromDirection(direction) {
  if (!direction) return 0;
  switch (direction.trim().toUpperCase()) {
    case 'N':
      return 0;
    case 'NNE':
      return 22.5;
    case 'NE':
      return 45;
    case 'ENE':
      return 67.5;
    case 'E':
      return 90;
    case 'ESE':
      return 112.5;
    case 'SE':
      return 135;
    case 'SSE':
      return 157.5;
    case 'S':
      return 180;
    case 'SSW':
      return 202.5;
    case 'SW':
      return 225;
    case 'WSW':
      return 247.5;
    case 'W':
      return 270;
    case 'WNW':
      return 292.5;
    case 'NW':
      return 325;
    case 'NNW':
      return 337.5;
    default:
      return 0;
  }
}

async function processHarvestResponse(
  sid,
  configId,
  graphId,
  traceId,
  longInterval,
  format,
  cookie
) {
  let date = new Date();
  let utcYear = date.getUTCFullYear();
  let utcMonth = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  let utcDay = date.getUTCDate().toString().padStart(2, '0');
  let utcHours = date.getUTCHours().toString().padStart(2, '0');
  let utcMins = date.getUTCMinutes().toString().padStart(2, '0');
  const dateTo = `${utcYear}-${utcMonth}-${utcDay}T${utcHours}:${utcMins}:00.000`;

  const intervalMins = longInterval ? 40 : 20; // get data for last 20 min, with some exceptions
  date = new Date(date.getTime() - intervalMins * 60 * 1000);
  utcYear = date.getUTCFullYear();
  utcMonth = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  utcDay = date.getUTCDate().toString().padStart(2, '0');
  utcHours = date.getUTCHours().toString().padStart(2, '0');
  utcMins = date.getUTCMinutes().toString().padStart(2, '0');
  const dateFrom = `${utcYear}-${utcMonth}-${utcDay}T${utcHours}:${utcMins}:00.000`;

  try {
    const cfg = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Connection: 'keep-alive'
      }
    };
    if (cookie) cfg.headers.Cookie = cookie;
    const { data } = await axios.post(
      `https://data1.harvest.com//php/site_graph_functions.php?retrieve_trace=&req_ref=${sid}_${configId}_${graphId}}`,
      {
        config_id: configId,
        trace_id: traceId,
        graph_id: graphId,
        start_date: dateFrom,
        start_date_stats: dateFrom,
        end_date: dateTo
      },
      cfg
    );

    if (format === 'array') {
      if (data && data.length) {
        const d = data[0].data;
        if (d && d.length) {
          const d1 = d[d.length - 1];
          return d1.data_value;
        }
      }
    } else if (format === 'object') {
      if (data && data['1']) {
        const d = data['1'].data;
        if (d && d.length) {
          const d1 = d[d.length - 1];
          return d1.data_value;
        }
      }
    }
  } catch (error) {
    logger.warn(`An error occured while fetching data for harvest - ${sid}`, {
      service: 'station',
      type: 'harvest'
    });
  }

  return null;
}

async function getHarvestData(
  stationId,
  windAvgId,
  windGustId,
  windDirId,
  tempId,
  longInterval,
  cookie
) {
  let ids = stationId.split('_');
  if (ids.length != 2) {
    return;
  }
  const sid = ids[0];
  const configId = ids[1];

  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  // wind avg
  ids = windAvgId.split('_');
  if (ids.length == 2) {
    windAverage = await processHarvestResponse(
      sid,
      configId,
      ids[0],
      ids[1],
      longInterval,
      sid === '1057' ? 'array' : 'object', // station 1057 has avg/gust switched
      cookie
    );
  }

  // wind gust
  ids = windGustId.split('_');
  if (ids.length == 2) {
    windGust = await processHarvestResponse(
      sid,
      configId,
      ids[0],
      ids[1],
      longInterval,
      sid === '1057' ? 'object' : 'array',
      cookie
    );
  }

  // wind direction
  ids = windDirId.split('_');
  if (ids.length == 2) {
    windBearing = await processHarvestResponse(
      sid,
      configId,
      ids[0],
      ids[1],
      longInterval,
      'array',
      cookie
    );
  }

  // temperature
  ids = tempId.split('_');
  if (ids.length == 2) {
    temperature = await processHarvestResponse(
      sid,
      configId,
      ids[0],
      ids[1],
      longInterval,
      'array',
      cookie
    );
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getMetserviceData(stationId) {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { data } = await axios.get(
      `https://www.metservice.com/publicData/webdata/weather-station-location/${stationId}/`,
      {
        headers: {
          Connection: 'keep-alive'
        }
      }
    );
    const modules = data.layout.primary.slots.main.modules;
    if (modules && modules.length) {
      const wind = modules[0].observations.wind;
      if (wind && wind.length) {
        windAverage = wind[0].averageSpeed;
        windGust = wind[0].gustSpeed;

        if (wind[0].strength === 'Calm') {
          if (windAverage == null) {
            windAverage = 0;
          }
          if (windGust == null) {
            windGust = 0;
          }
        }

        windBearing = getWindBearingFromDirection(wind[0].direction);
      }
      const temp = modules[0].observations.temperature;
      if (temp && temp.length && temp[0]) {
        temperature = temp[0].current;
      }
    }
  } catch (error) {
    logger.warn(`An error occured while fetching data for metservice - ${stationId}`, {
      service: 'station',
      type: 'metservice'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getAttentisData(stationId) {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { data } = await axios.get('https://api.attentistechnology.com/sensor-overview', {
      headers: { Authorization: `Bearer ${process.env.ATTENTIS_KEY}`, Connection: 'keep-alive' }
    });
    if (data.data && data.data.weather_readings) {
      const d = data.data.weather_readings[stationId];
      if (d) {
        windAverage = d.wind_speed;
        windGust = d.wind_gust_speed;
        windBearing = d.wind_direction;
        temperature = d.air_temp;
      }
    }
  } catch (error) {
    logger.warn(`An error occured while fetching data for attentis - ${stationId}`, {
      service: 'station',
      type: 'other'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getCwuData(stationId) {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { data } = await axios.get(`https://cwu.co.nz/forecast/${stationId}/`, {
      responseType: 'text',
      headers: {
        Connection: 'keep-alive'
      }
    });
    if (data.length) {
      // wind avg + direction
      let startStr = 'Current Windspeed:&nbsp;</label><span>&nbsp;';
      let i = data.indexOf(startStr);
      if (i >= 0) {
        const j = data.indexOf('km/h.</span>', i);
        if (j > i) {
          const tempArray = data
            .slice(i + startStr.length, j)
            .trim()
            .split(' ');
          if (tempArray.length == 2) {
            windBearing = getWindBearingFromDirection(tempArray[0]);
            const temp1 = Number(tempArray[1]);
            if (!isNaN(temp1)) {
              windAverage = temp1;
            }
          }
        }
      }

      // wind gust
      startStr = 'Wind Gusting To:&nbsp;</label><span>&nbsp;';
      i = data.indexOf(startStr);
      if (i >= 0) {
        const j = data.indexOf('km/h.</span>', i);
        if (j > i) {
          const temp = Number(data.slice(i + startStr.length, j).trim());
          if (!isNaN(temp)) windGust = temp;
        }
      }

      // temperature
      startStr = 'Now</span><br/>';
      i = data.indexOf(startStr);
      if (i >= 0) {
        const j = data.indexOf('°C</p>', i);
        if (j > i) {
          const temp = Number(data.slice(i + startStr.length, j).trim());
          if (!isNaN(temp)) {
            temperature = temp;
          }
        }
      }
    }
  } catch (error) {
    logger.warn(`An error occured while fetching data for cwu - ${stationId}`, {
      service: 'station',
      type: 'other'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getWeatherProData(stationId) {
  let windAverage = null;
  const windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { data } = await axios.get(
      `https://www.weather-pro.com/reports/Realtime.php?SN=${stationId}`,
      {
        headers: {
          Connection: 'keep-alive'
        }
      }
    );
    if (data.length) {
      // wind avg
      let startStr = 'Wind Speed</td><td style="font-size:200%;">:';
      let i = data.indexOf(startStr);
      if (i >= 0) {
        const j = data.indexOf('kph</td></tr>', i);
        if (j > i) {
          const temp = Number(data.slice(i + startStr.length, j).trim());
          if (!isNaN(temp)) windAverage = temp;
        }
      }

      // wind direction
      startStr = 'Wind Direction</td><td style="font-size:200%;">:';
      i = data.indexOf(startStr);
      if (i >= 0) {
        const j = data.indexOf('°</td></tr>', i);
        if (j > i) {
          const temp = Number(data.slice(i + startStr.length, j).trim());
          if (!isNaN(temp)) windBearing = temp;
        }
      }

      // temperature
      startStr = 'Air Temperature</td><td style="font-size:200%;">:';
      i = data.indexOf(startStr);
      if (i >= 0) {
        const j = data.indexOf('°C</td></tr>', i);
        if (j > i) {
          const temp = Number(data.slice(i + startStr.length, j).trim());
          if (!isNaN(temp)) temperature = temp;
        }
      }
    }
  } catch (error) {
    logger.warn(`An error occured while fetching data for weatherpro - ${stationId}`, {
      service: 'station',
      type: 'other'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getPortOtagoData(stationId) {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  const temperature = null;

  try {
    const { data } = await axios.get(
      `https://dvp.portotago.co.nz/dvp/graphs/htmx/get-graph/${stationId}`,
      {
        headers: {
          Connection: 'keep-alive'
        }
      }
    );
    if (data.length) {
      // wind avg
      let startStr = '<p class="seriesName">Wind Speed Avg</p>';
      let i = data.indexOf(startStr);
      if (i >= 0) {
        startStr = '<p class="seriesValue">';
        const j = data.indexOf(startStr, i);
        if (j > i) {
          const k = data.indexOf('</p>', j);
          if (k > i) {
            const temp = Number(data.slice(j + startStr.length, k).trim());
            if (!isNaN(temp)) windAverage = temp * 1.852;
          }
        }
      }

      // wind gust
      startStr = '<p class="seriesName">Wind Gust Max</p>';
      i = data.indexOf(startStr);
      if (i >= 0) {
        startStr = '<p class="seriesValue">';
        const j = data.indexOf(startStr, i);
        if (j > i) {
          const k = data.indexOf('</p>', j);
          if (k > i) {
            const temp = Number(data.slice(j + startStr.length, k).trim());
            if (!isNaN(temp)) windGust = temp * 1.852;
          }
        }
      }

      // wind direction
      startStr = '<p class="seriesName">Wind Dir Avg</p>';
      i = data.indexOf(startStr);
      if (i >= 0) {
        startStr = '<p class="seriesValue">';
        const j = data.indexOf(startStr, i);
        if (j > i) {
          const k = data.indexOf('</p>', j);
          if (k > i) {
            const temp = Number(data.slice(j + startStr.length, k).trim());
            if (!isNaN(temp)) windBearing = temp;
          }
        }
      }
    }
  } catch (error) {
    logger.warn(`An error occured while fetching data for port otago - ${stationId}`, {
      service: 'station',
      type: 'other'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getWUndergroundData(stationId) {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { data } = await axios.get(
      `https://api.weather.com/v2/pws/observations/current?apiKey=${process.env.WUNDERGROUND_KEY}&stationId=${stationId}&numericPrecision=decimal&format=json&units=m`,
      {
        headers: {
          Connection: 'keep-alive'
        }
      }
    );
    const observations = data.observations;
    if (observations && observations.length) {
      windBearing = observations[0].winddir;
      const d = observations[0].metric;
      if (d) {
        windAverage = d.windSpeed;
        windGust = d.windGust;
        temperature = d.temp;
      }
    }
  } catch (error) {
    logger.warn(`An error occured while fetching data for wunderground - ${stationId}`, {
      service: 'station',
      type: 'other'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getTempestData(stationId) {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { data } = await axios.get(
      `https://swd.weatherflow.com/swd/rest/better_forecast?api_key=${process.env.TEMPEST_KEY}&station_id=${stationId}&units_temp=c&units_wind=kph`,
      {
        headers: {
          Connection: 'keep-alive'
        }
      }
    );
    const cc = data.current_conditions;
    if (cc) {
      windAverage = cc.wind_avg;
      windGust = cc.wind_gust;
      windBearing = cc.wind_direction;
      temperature = cc.air_temperature;
    }
  } catch (error) {
    logger.warn(`An error occured while fetching data for tempest - ${stationId}`, {
      service: 'station',
      type: 'other'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getWindguruData(stationId) {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { data } = await axios.get(
      `https://www.windguru.cz/int/iapi.php?q=station_data_current&id_station=${stationId}`,
      {
        headers: {
          Connection: 'keep-alive',
          Referer: `https://www.windguru.cz/station/${stationId}`
        }
      }
    );
    if (data) {
      windAverage = data.wind_avg * 1.852;
      windGust = data.wind_max * 1.852;
      windBearing = data.wind_direction;
      temperature = data.temperature;
    }
  } catch (error) {
    logger.warn(`An error occured while fetching data for windguru - ${stationId}`, {
      service: 'station',
      type: 'other'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getCentrePortData(stationId) {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  const temperature = null;

  try {
    const dateFrom = new Date(Date.now() - 720 * 60 * 1000); // current time - 12h
    const dateTo = new Date(dateFrom.getTime() + 1081 * 60 * 1000); // date from + 18h 1min

    if (stationId === 'BaringHead') {
      const { data } = await axios.get(
        'https://portweather-public.omcinternational.com/api/datasources/proxy/393//api/data/transformRecordsFromPackets' +
          `?sourcePath=${encodeURIComponent(`NZ/Wellington/Wind/Measured/NIWA-API/${stationId}`)}` +
          '&transformer=LatestNoTransform' +
          `&fromDate_Utc=${encodeURIComponent(dateFrom.toISOString())}` +
          `&toDate_Utc=${encodeURIComponent(dateTo.toISOString())}` +
          '&qaStatusesString=*',
        {
          headers: { 'x-grafana-org-id': 338, Connection: 'keep-alive' }
        }
      );
      if (data.length && data[0]) {
        windAverage = data[0].speed_kn * 1.852; // data is in kt
        windGust = data[0].gust_kn * 1.852;
        windBearing = data[0].from_deg;
      }
    } else {
      const { data } = await axios.get(
        'https://portweather-public.omcinternational.com/api/datasources/proxy/393//api/data/transformRecordsFromPackets' +
          `?sourcePath=${encodeURIComponent(`NZ/Wellington/Wind/Measured/${stationId}`)}` +
          '&transformer=LatestNoTransform' +
          `&fromDate_Utc=${encodeURIComponent(dateFrom.toISOString())}` +
          `&toDate_Utc=${encodeURIComponent(dateTo.toISOString())}` +
          '&qaStatusesString=*',
        {
          headers: { 'x-grafana-org-id': 338, Connection: 'keep-alive' }
        }
      );
      if (data.length && data[0]) {
        windAverage = data[0].WindSpd_01MnAvg * 1.852; // data is in kt
        windGust = data[0].WindGst_01MnMax * 1.852;
        windBearing = Number(data[0].WindDir_01MnAvg);
      }
    }
  } catch (error) {
    logger.warn(`An error occured while fetching data for centreport - ${stationId}`, {
      service: 'station',
      type: 'other'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getGreaterWellingtonData(
  stationId,
  gwWindAverageFieldName,
  gwWindGustFieldName,
  gwWindBearingFieldName,
  gwTemperatureFieldName
) {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const dateTo = new Date();
    const dateFrom = new Date(dateTo.getTime() - 30 * 60 * 1000);
    const url =
      'https://hilltop.gw.govt.nz/Data.hts/?Service=Hilltop&Request=GetData' +
      `&Site=${encodeURIComponent(stationId)}` +
      `&From=${encodeURIComponent(formatInTimeZone(dateFrom, 'Pacific/Auckland', 'yyyy-MM-dd HH:mm:ss'))}` +
      `&To=${encodeURIComponent(formatInTimeZone(dateTo, 'Pacific/Auckland', 'yyyy-MM-dd HH:mm:ss'))}`;

    // wind avg
    if (gwWindAverageFieldName) {
      const { data } = await axios.get(
        url + `&Measurement=${encodeURIComponent(gwWindAverageFieldName)}`,
        {
          headers: { Connection: 'keep-alive' }
        }
      );
      if (data.length) {
        const matches = data.match(/<I1>\d+.?\d*<\/I1>/g);
        if (matches && matches.length) {
          windAverage = Number(
            matches[matches.length - 1].replace('<I1>', '').replace('</I1>', '')
          );
        }
      }
    }

    // wind gust
    if (gwWindGustFieldName) {
      const { data } = await axios.get(
        url + `&Measurement=${encodeURIComponent(gwWindGustFieldName)}`,
        {
          headers: { Connection: 'keep-alive' }
        }
      );
      if (data.length) {
        const matches = data.match(/<I1>\d+.?\d*<\/I1>/g);
        if (matches && matches.length) {
          windGust = Number(matches[matches.length - 1].replace('<I1>', '').replace('</I1>', ''));
        }
      }
    }

    // wind bearing
    if (gwWindBearingFieldName) {
      const { data } = await axios.get(
        url + `&Measurement=${encodeURIComponent(gwWindBearingFieldName)}`,
        {
          headers: { Connection: 'keep-alive' }
        }
      );
      if (data.length) {
        const matches = data.match(/<I1>\d+.?\d*<\/I1>/g);
        if (matches && matches.length) {
          windBearing = Number(
            matches[matches.length - 1].replace('<I1>', '').replace('</I1>', '')
          );
        }
      }
    }

    // temperature
    if (gwTemperatureFieldName) {
      const { data } = await axios.get(
        url + `&Measurement=${encodeURIComponent(gwTemperatureFieldName)}`,
        {
          headers: { Connection: 'keep-alive' }
        }
      );
      if (data.length) {
        const matches = data.match(/<I1>\d+.?\d*<\/I1>/g);
        if (matches && matches.length) {
          temperature = Number(
            matches[matches.length - 1].replace('<I1>', '').replace('</I1>', '')
          );
        }
      }
    }
  } catch (error) {
    logger.warn(`An error occured while fetching data for greater wellington - ${stationId}`, {
      service: 'station',
      type: 'other'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getLpcData() {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    let date = new Date();
    const dateTo = date.toISOString();
    date = new Date(date.getTime() - 1441 * 60 * 1000); // date from is current time - (1 day + 1 min)
    const dateFrom = date.toISOString();
    let { data } = await axios.get(
      'https://portweather-public.omcinternational.com/api/datasources/proxy/391//api/data/transformRecordsFromPackets' +
        `?sourcePath=${encodeURIComponent('NZ/Lyttelton/Meteo/Measured/Lyttelton TABW')}` +
        '&transformer=LatestNoTransform' +
        `&fromDate_Utc=${encodeURIComponent(dateFrom)}` +
        `&toDate_Utc=${encodeURIComponent(dateTo)}` +
        '&qaStatusesString=*',
      {
        headers: { 'x-grafana-org-id': 338, Connection: 'keep-alive' }
      }
    );
    if (data.length && data[0]) {
      windAverage = data[0].windspd_01mnavg * 1.852; // data is in kt
      windGust = data[0].windgst_01mnmax * 1.852;
      windBearing = data[0].winddir_01mnavg;
    }

    ({ data } = await axios.post(
      'https://portweather-public.omcinternational.com/api/ds/query',
      {
        from: dateFrom,
        queries: [
          {
            datasourceId: 391,
            sourcePath: 'NZ/Lyttelton/Meteo/Measured/Lyttelton IHJ3',
            sourceProperty: 'airtemp_01mnavg',
            transformerType: 'LatestMeasuredGenericPlot',
            type: 'timeseries'
          }
        ],
        to: dateTo
      },
      {
        headers: {
          Connection: 'keep-alive'
        }
      }
    ));
    const frames = data.results[''].frames;
    if (frames && frames.length) {
      const vals = frames[0].data.values;
      if (vals && vals.length == 2) {
        if (vals[1] && vals[1].length) {
          temperature = vals[1][0];
        }
      }
    }
  } catch (error) {
    logger.warn('An error occured while fetching data for lpc', {
      service: 'station',
      type: 'other'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getMpycData() {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { data } = await axios.get('https://mpyc.nz/weather/json/weewx_data.json');
    if (data.current) {
      const avg = data.current.windspeed
        ? Number(data.current.windspeed.replace(' knots', ''))
        : null;
      if (avg != null && !isNaN(avg)) {
        windAverage = avg * 1.852; // data is in kt
      }
      const gust = data.current.windGust
        ? Number(data.current.windspeed.replace(' knots', ''))
        : null;
      if (gust != null && !isNaN(gust)) {
        windGust = gust * 1.852;
      }
      const bearing = data.current.winddir_formatted
        ? Number(data.current.winddir_formatted)
        : null;
      if (bearing != null && !isNaN(bearing)) {
        windBearing = bearing;
      }
      const temp = data.current.outTemp_formatted ? Number(data.current.outTemp_formatted) : null;
      if (temp != null && !isNaN(temp)) temperature = temp;
    }
  } catch (error) {
    logger.warn('An error occured while fetching data for mpyc', {
      service: 'station',
      type: 'other'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getNavigatusData() {
  let windAverage = null;
  const windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { data } = await axios.get(`https://nzqnwx.navigatus.aero/frontend/kelvin_iframe`, {
      headers: {
        Connection: 'keep-alive'
      }
    });
    if (data.length) {
      // wind direction
      let dirStr = '';
      let startStr = '<div class="wind-data">';
      let i = data.indexOf(startStr);
      if (i >= 0) {
        startStr = '<p>';
        const j = data.indexOf(startStr, i);
        if (j > i) {
          const k = data.indexOf('</p>', j);
          if (k > i) {
            dirStr = data.slice(j + startStr.length, k).trim();
            switch (dirStr.toUpperCase()) {
              case 'NORTHERLY':
                windBearing = 0;
                break;
              case 'NORTH-EASTERLY':
                windBearing = 45;
                break;
              case 'EASTERLY':
                windBearing = 90;
                break;
              case 'SOUTH-EASTERLY':
                windBearing = 135;
                break;
              case 'SOUTHERLY':
                windBearing = 180;
                break;
              case 'SOUTH-WESTERLY':
                windBearing = 225;
                break;
              case 'WESTERLY':
                windBearing = 270;
                break;
              case 'NORTH-WESTERLY':
                windBearing = 315;
                break;
              default:
                break;
            }
          }
        }
      }

      // wind avg
      startStr = `<p>${dirStr}</p>`;
      i = data.indexOf(startStr);
      if (i >= 0) {
        const startStr1 = '<p>';
        const j = data.indexOf(startStr1, i + startStr.length);
        if (j > i) {
          const k = data.indexOf('km/h</p>', j);
          if (k > i) {
            const temp = Number(data.slice(j + startStr1.length, k).trim());
            if (!isNaN(temp)) windAverage = temp;
          }
        }
      }

      // temperature
      startStr = '<p>Temperature:';
      i = data.indexOf(startStr);
      if (i >= 0) {
        const j = data.indexOf('&deg;</p>', i);
        if (j > i) {
          const temp = Number(data.slice(i + startStr.length, j).trim());
          if (!isNaN(temp)) temperature = temp;
        }
      }
    }
  } catch (error) {
    logger.warn('An error occured while fetching data for navigatus', {
      service: 'station',
      type: 'other'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getMfhbData() {
  let windAverage = null;
  const windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { data } = await axios.get(
      '	https://www.weatherlink.com/embeddablePage/getData/5e1372c8fe104ac5acc1fe2d8cb8b85c',
      {
        headers: {
          Connection: 'keep-alive'
        }
      }
    );
    if (data) {
      windAverage = data.wind;
      windBearing = data.windDirection;
      temperature = data.temperature;
    }
  } catch (error) {
    logger.warn('An error occured while fetching data for mfhb', {
      service: 'station',
      type: 'other'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getMrcData() {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { data } = await axios.post(
      'https://www.otago.ac.nz/surveying/potree/remote/pisa_meteo/OtagoUni_PisaRange_PisaMeteo.csv',
      {
        responseType: 'text',
        headers: {
          Connection: 'keep-alive'
        }
      }
    );
    const matches = data.match(/"[0-9]{4}-[0-9]{2}-[0-9]{2}\s[0-9]{2}:[0-9]{2}:[0-9]{2}"/g);
    if (matches && matches.length) {
      const lastRow = data.slice(data.lastIndexOf(matches[matches.length - 1]));
      const temp = lastRow.split(',');
      if (temp.length == 39) {
        windAverage = Math.round(Number(temp[23]) * 3.6 * 100) / 100;
        windGust = Math.round(Number(temp[26]) * 3.6 * 100) / 100;
        windBearing = Number(temp[24]);
        temperature = Number(temp[7]);
      }
    }
  } catch (error) {
    logger.warn('An error occured while fetching data for mrc', {
      service: 'station',
      type: 'other'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getWainuiData() {
  let windAverage = null;
  const windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { data } = await axios.get('http://mcgavin.no-ip.info/weather/wainui/index.html', {
      headers: {
        Connection: 'keep-alive'
      }
    });
    if (data.length) {
      // wind direction
      let startStr = '<td><b>Wind Direction</b> (average 1 minute)</td>';
      let i = data.indexOf(startStr);
      if (i >= 0) {
        const startStr1 = '<td><b>';
        const j = data.indexOf(startStr1, i + startStr.length);
        if (j > i) {
          const k = data.indexOf('&#176;', j);
          if (k > i) {
            const temp = Number(data.slice(j + startStr1.length, k).trim());
            if (!isNaN(temp)) windBearing = temp;
          }
        }
      }

      // wind avg
      startStr = '<td><b>Wind Speed</b> (average 1 minute)</td>';
      i = data.indexOf(startStr);
      if (i >= 0) {
        const startStr1 = '<td><b>';
        const j = data.indexOf(startStr1, i + startStr.length);
        if (j > i) {
          const k = data.indexOf('</b></td>', j);
          if (k > i) {
            const temp1 = data
              .slice(j + startStr1.length, k)
              .replace('km/h', '')
              .trim();
            console.log(temp1);
            if (temp1.toUpperCase() === 'CALM') {
              windAverage = 0;
            } else {
              const temp = Number(temp1);
              if (!isNaN(temp)) windAverage = temp;
            }
          }
        }
      }

      // temperature
      startStr = '<td><b>Temperature</b></td>';
      i = data.indexOf(startStr);
      if (i >= 0) {
        const startStr1 = '<td><b>';
        const j = data.indexOf(startStr1, i + startStr.length);
        if (j > i) {
          const k = data.indexOf('&#176;', j);
          if (k > i) {
            const temp = Number(data.slice(j + startStr1.length + 1, k).trim());
            if (!isNaN(temp)) temperature = temp;
          }
        }
      }
    }
  } catch (error) {
    logger.warn('An error occured while fetching data for wainui', {
      service: 'station',
      type: 'other'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getPrimePortData() {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  const temperature = null;

  try {
    // fetch img
    const response = await axios.get('https://local.timaru.govt.nz/primeport/NorthMoleWind.jpg', {
      responseType: 'arraybuffer',
      headers: {
        Connection: 'keep-alive'
      }
    });
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    const imgBuff = Buffer.from(base64, 'base64');

    // init OCR
    const dir = 'public/temp';
    await fs.mkdir(dir, { recursive: true });
    const worker = await createWorker('eng');

    // avg
    let croppedBuf = await sharp(imgBuff)
      .extract({ left: 850, top: 165, width: 175, height: 50 })
      .toBuffer();
    let path = `${dir}/primeportavg.jpg`;
    await fs.writeFile(path, croppedBuf);

    const reg = /[^0-9.]/g;
    let ret = await worker.recognize(path);
    const textAvg = ret.data.text.replace(reg, '');

    // gust
    croppedBuf = await sharp(imgBuff)
      .extract({ left: 850, top: 25, width: 175, height: 50 })
      .toBuffer();
    path = `${dir}/primeportgust.jpg`;
    await fs.writeFile(path, croppedBuf);

    ret = await worker.recognize(path);
    const textGust = ret.data.text.replace(reg, '');

    windAverage = isNaN(textAvg) ? 0 : Number(textAvg);
    windGust = isNaN(textGust) ? 0 : Number(textGust);

    // sometimes OCR misses a period
    if (!textAvg.includes('.') && textGust.includes('.')) {
      const i = textGust.indexOf('.');
      windAverage = Number(`${textAvg.slice(0, i)}.${textAvg.slice(i)}`);
      if (windAverage > windGust) windAverage = Math.round(windAverage * 100) / 1000;
    } else if (textAvg.includes('.') && !textGust.includes('.')) {
      const i = textAvg.indexOf('.');
      windGust = Number(`${textGust.slice(0, i)}.${textGust.slice(i)}`);
      if (windAverage > windGust) windGust = Math.round(windGust * 1000) / 100;
    } else if (!textAvg.includes('.') && !textGust.includes('.')) {
      if (windAverage > 10) windAverage = null;
      if (windGust > 10) windGust = null;
    }

    if (windAverage != null) windAverage = Math.round(windAverage * 1.852 * 100) / 100;
    if (windGust != null) windGust = Math.round(windGust * 1.852 * 100) / 100;

    // direction
    croppedBuf = await sharp(imgBuff)
      .extract({ left: 845, top: 245, width: 180, height: 50 })
      .toBuffer();
    path = `${dir}/primeportdir.jpg`;
    await fs.writeFile(path, croppedBuf);

    ret = await worker.recognize(path);
    windBearing = Number(ret.data.text.replace(reg, ''));

    // cleanup
    await worker.terminate();
    await fs.rm(dir, { recursive: true, force: true });
  } catch (error) {
    logger.warn('An error occured while fetching data for prime port', {
      service: 'station',
      type: 'other'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getWeatherLinkData() {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { data } = await axios.get(
      'https://www.weatherlink.com/embeddablePage/summaryData/daf6068a35484c1aad7a941c4a9b0701',
      {
        headers: {
          Connection: 'keep-alive'
        }
      }
    );

    if (data && data.currConditionValues.length) {
      for (const d of data.currConditionValues) {
        if (d.sensorDataName.toUpperCase() === '10 MIN AVG WIND SPEED') {
          windAverage = Number(d.convertedValue);
        } else if (d.sensorDataName.toUpperCase() === '10 MIN HIGH WIND SPEED') {
          windGust = Number(d.convertedValue);
        } else if (d.sensorDataName.toUpperCase() === '1 MIN SCALAR AVG WIND DIRECTION') {
          windBearing = d.value;
        } else if (d.sensorDataName.toUpperCase() === 'TEMP') {
          temperature = Number(d.convertedValue);
        }
      }
    }
  } catch (error) {
    logger.warn('An error occured while fetching data for weatherlink', {
      service: 'station',
      type: 'other'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getHuttWeatherData() {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { data } = await axios.get('https://www.huttweather.co.nz/pwsWD/', {
      headers: {
        Connection: 'keep-alive'
      }
    });
    if (data.length) {
      // wind avg
      let startStr =
        '<td style="font-size: 15px; text-align: right; border-right: 1px solid  black;"><b>';
      let i = data.indexOf(startStr);
      if (i >= 0) {
        const j = data.indexOf('</b>&nbsp;</td>', i);
        if (j > i) {
          const temp = Number(data.slice(i + startStr.length, j).trim());
          if (!isNaN(temp)) windAverage = temp;
        }
      }

      // wind gust
      startStr = '<td style="font-size: 15px; text-align: left;  width: 50%; ">&nbsp;<b>';
      i = data.indexOf(startStr);
      if (i >= 0) {
        const j = data.indexOf('</b></td>', i);
        if (j > i) {
          const temp = Number(data.slice(i + startStr.length, j).trim());
          if (!isNaN(temp)) windGust = temp;
        }
      }

      // wind direction
      startStr =
        '<td colspan="2" style="height: 24px; text-align: center; border-top: 1px solid   black;">';
      i = data.indexOf(startStr);
      if (i >= 0) {
        const j = data.indexOf('&deg;  <b>', i);
        if (j > i) {
          const temp = Number(data.slice(i + startStr.length, j).trim());
          if (!isNaN(temp)) windBearing = temp;
        }
      }

      // temperature
      startStr = '<b style="font-size: 20px;">';
      i = data.indexOf(startStr);
      if (i >= 0) {
        const j = data.indexOf('&deg;</b>', i);
        if (j > i) {
          const temp = Number(data.slice(i + startStr.length, j).trim());
          if (!isNaN(temp)) temperature = temp;
        }
      }
    }
  } catch (error) {
    logger.warn('An error occured while fetching data for hutt weather', {
      service: 'station',
      type: 'other'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function saveData(station, data, date) {
  // handle likely erroneous values
  let avg = data.windAverage;
  if (isNaN(avg) || avg < 0 || avg > 500) {
    avg = null;
  }
  let gust = data.windGust;
  if (isNaN(gust) || gust < 0 || gust > 500) {
    gust = null;
  }
  let bearing = data.windBearing;
  if (isNaN(bearing) || bearing < 0 || bearing > 360) {
    bearing = null;
  }
  let temperature = data.temperature;
  if (isNaN(temperature) || temperature < -40 || temperature > 60) {
    temperature = null;
  }

  // update station
  station.lastUpdate = new Date();
  station.currentAverage = avg ?? null;
  station.currentGust = gust ?? null;
  station.currentBearing = bearing ?? null;
  station.currentTemperature = temperature ?? null;

  if (avg != null || gust != null) {
    station.isOffline = false;
  }
  if (avg != null && gust != null && bearing != null && temperature != null) {
    station.isError = false;
  }
  await station.save();

  // add data
  await Station.updateOne(
    { _id: station._id },
    {
      $push: {
        data: {
          time: date,
          windAverage: avg ?? null,
          windGust: gust ?? null,
          windBearing: bearing ?? null,
          temperature: temperature ?? null
        }
      }
    }
  );
}

export async function stationWrapper(source) {
  try {
    const query = {};
    if (source === 'harvest') query.type = 'harvest';
    else if (source === 'metservice') query.type = 'metservice';
    else query.type = { $nin: ['holfuy', 'harvest', 'metservice'] };

    const stations = await Station.find(query, { data: 0 });
    if (!stations.length) {
      logger.error(`No ${source} stations found.`, {
        service: 'station',
        type: source ? source : 'other'
      });
      return null;
    }

    const date = getFlooredTime();
    for (const s of stations) {
      let data = null;
      if (source === 'harvest') {
        if (s.type === 'harvest') {
          data = await getHarvestData(
            s.externalId,
            s.harvestWindAverageId,
            s.harvestWindGustId,
            s.harvestWindDirectionId,
            s.harvestTemperatureId,
            s.harvestLongInterval, // some harvest stations only update every 30 min
            s.harvestCookie // station 10243,11433 needs PHPSESSID cookie for auth
          );
          if (s.externalId === '11433_171221') {
            // this station is in kt
            if (data.windAverage) data.windAverage *= 1.852;
            if (data.windGust) data.windGust *= 1.852;
          }
        }
      } else if (source === 'metservice') {
        if (s.type === 'metservice') {
          data = await getMetserviceData(s.externalId);
        }
      } else {
        if (s.type === 'attentis') {
          data = await getAttentisData(s.externalId);
        } else if (s.type === 'wu') {
          data = await getWUndergroundData(s.externalId);
        } else if (s.type === 'tempest') {
          data = await getTempestData(s.externalId);
        } else if (s.type === 'windguru') {
          data = await getWindguruData(s.externalId);
        } else if (s.type === 'cwu') {
          data = await getCwuData(s.externalId);
        } else if (s.type === 'wp') {
          data = await getWeatherProData(s.externalId);
        } else if (s.type === 'cp') {
          data = await getCentrePortData(s.externalId);
        } else if (s.type === 'gw') {
          data = await getGreaterWellingtonData(
            s.externalId,
            s.gwWindAverageFieldName,
            s.gwWindGustFieldName,
            s.gwWindBearingFieldName,
            s.gwTemperatureFieldName
          );
        } else if (s.type === 'po') {
          data = await getPortOtagoData(s.externalId);
        } else if (s.type === 'lpc') {
          data = await getLpcData();
        } else if (s.type === 'mpyc') {
          data = await getMpycData();
        } else if (s.type === 'navigatus') {
          data = await getNavigatusData();
        } else if (s.type === 'mfhb') {
          data = await getMfhbData();
        } else if (s.type === 'mrc') {
          data = await getMrcData();
        } else if (s.type === 'wainui') {
          data = await getWainuiData();
        } else if (s.type === 'prime') {
          data = await getPrimePortData();
        } else if (s.type === 'wl') {
          data = await getWeatherLinkData();
        } else if (s.type === 'hw') {
          data = await getHuttWeatherData();
        }
      }

      if (data) {
        logger.info(`${s.type} data updated${s.externalId ? ` - ${s.externalId}` : ''}`, {
          service: 'station',
          type: source ? source : 'other'
        });
        logger.info(JSON.stringify(data), { service: 'station', type: source ? source : 'other' });
        await saveData(s, data, date);
      }
    }
  } catch (error) {
    logger.error(`An error occurred while fetching ${source} station data`, {
      service: 'station',
      type: source ? source : 'other'
    });
    logger.error(error, { service: 'station', type: source ? source : 'other' });
    return null;
  }
}

async function getHolfuyData(stationId) {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { headers } = await axios.get(`https://holfuy.com/en/weather/${stationId}`);
    const cookies = headers['set-cookie'];
    if (cookies && cookies.length && cookies[0]) {
      const { data } = await axios.get(`https://holfuy.com/puget/mjso.php?k=${stationId}`, {
        headers: {
          Cookie: cookies[0],
          Connection: 'keep-alive'
        }
      });
      windAverage = data.speed;
      windGust = data.gust;
      windBearing = data.dir;
      temperature = data.temperature;
    }
  } catch (error) {
    logger.warn(`An error occured while fetching data for holfuy - ${stationId}`, {
      service: 'station',
      type: 'holfuy'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

export async function holfuyWrapper() {
  try {
    const stations = await Station.find({ type: 'holfuy' }, { data: 0 });
    if (!stations.length) {
      logger.error('No holfuy stations found.', { service: 'station', type: 'holfuy' });
      return null;
    }

    const { data } = await axios.get(
      `https://api.holfuy.com/live/?pw=${process.env.HOLFUY_KEY}&m=JSON&tu=C&su=km/h&s=all`
    );

    const date = getFlooredTime();
    for (const s of stations) {
      let d = null;
      const matches = data.measurements.filter((m) => {
        return m.stationId.toString() === s.externalId;
      });
      if (matches.length == 1) {
        const wind = matches[0].wind;
        d = {
          windAverage: wind?.speed ?? null,
          windGust: wind?.gust ?? null,
          windBearing: wind?.direction ?? null,
          temperature: matches[0]?.temperature ?? null
        };
      } else {
        d = await getHolfuyData(s.externalId);
      }

      if (d) {
        logger.info(`holfuy data updated - ${s.externalId}`, {
          service: 'station',
          type: 'holfuy'
        });
        logger.info(JSON.stringify(d), { service: 'station', type: 'holfuy' });
        await saveData(s, d, date);
      }
    }
  } catch (error) {
    logger.error('An error occured while fetching holfuy station data', {
      service: 'station',
      type: 'holfuy'
    });
    logger.error(error, { service: 'station', type: 'holfuy' });
    return null;
  }
}

function cmp(a, b) {
  if (a > b) return +1;
  if (a < b) return -1;
  return 0;
}
export async function jsonOutputWrapper() {
  try {
    var date = getFlooredTime();
    const stations = await Station.find({}, { data: 0 });
    const json = [];
    for (const s of stations) {
      let avg = s.currentAverage;
      let gust = s.currentGust;
      let bearing = s.currentBearing;
      let temp = s.currentTemperature;

      if (Date.now() - new Date(s.lastUpdate).getTime() > 10 * 60 * 1000) {
        avg = null;
        gust = null;
        bearing = null;
        temp = null;
      }

      json.push({
        id: s._id,
        name: s.name,
        type: s.type,
        coordinates: {
          lat: s.location.coordinates[1],
          lon: s.location.coordinates[0]
        },
        timestamp: date.getTime() / 1000,
        wind: {
          average: avg,
          gust: gust,
          bearing: bearing
        },
        temperature: temp
      });
    }

    json.sort((a, b) => {
      return cmp(a.type, b.type) || cmp(a.name, b.name);
    });
    const dir = `public/data/${formatInTimeZone(date, 'UTC', 'yyyy/MM/dd')}`;
    await fs.mkdir(dir, { recursive: true });
    const path = `${dir}/zephyr-scrape-${date.getTime() / 1000}.json`;
    await fs.writeFile(path, JSON.stringify(json));
    logger.info(`File created - ${path}`, { service: 'json' });

    const output = new Output({
      time: date,
      url: `https://fs.zephyrapp.nz/${path.replace('public/', '')}`
    });
    await output.save();
  } catch (error) {
    logger.error('An error occurred while processing json output', { service: 'json' });
    logger.error(error, { service: 'json' });
  }
}

function groupBy(xs, key) {
  return xs.reduce(function (rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
}
export async function checkForErrors() {
  try {
    const stations = await Station.find({});
    if (!stations.length) {
      logger.error('No stations found.', { service: 'errors' });
      return null;
    }

    const errors = [];
    const timeNow = Date.now();

    for (const s of stations) {
      let isDataError = true;
      let isWindError = true;
      let isBearingError = true;
      let isTempError = true;

      // check last 6h data
      const data = s.data.filter((x) => {
        return new Date(x.time) >= new Date(timeNow - 6 * 60 * 60 * 1000);
      });

      if (data.length) {
        data.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()); // time desc

        // check that data exists up to 20min before current time
        if (timeNow - new Date(data[0].time).getTime() <= 20 * 60 * 1000) {
          isDataError = false;
          for (const d of data) {
            if (d.windAverage != null || d.windGust != null) {
              isWindError = false;
            }
            if (d.windBearing != null) {
              isBearingError = false;
            }
            if (d.temperature != null) {
              isTempError = false;
            }
          }
        }
      }

      let errorMsg = '';
      if (isDataError) {
        errorMsg = 'ERROR: Data scraper has stopped.\n';
      } else if (isWindError) {
        errorMsg += 'ERROR: No wind avg/gust data.\n';
      }

      if (isDataError || isWindError) {
        if (!s.isOffline) {
          s.isOffline = true;
          await s.save();
          errors.push({
            type: s.type,
            msg: `${errorMsg}Name: ${s.name}\nURL: ${s.externalLink}\nDatabase ID: ${s._id}\n`
          });
        }
      }

      if (isDataError || isWindError || isBearingError || isTempError) {
        if (!s.isError) {
          s.isError = true;
          await s.save();
        }
      }
    }

    if (errors.length) {
      // send email if >2 stations of the same type went offline simultaneously
      let msg = '';
      const g = groupBy(errors, 'type');
      const singleStations = ['lpc', 'mpyc', 'navigatus', 'mfhb', 'mrc', 'wainui'];
      for (const [key, value] of Object.entries(g)) {
        if (singleStations.includes(key) || value.length > 2) {
          msg += `\n${key.toUpperCase()}\n\n`;
          msg += value.map((x) => x.msg).join('\n');
        }
      }
      if (msg.length) {
        await axios.post(`https://api.emailjs.com/api/v1.0/email/send`, {
          service_id: process.env.EMAILJS_SERVICE_ID,
          template_id: process.env.EMAILJS_TEMPLATE_ID,
          user_id: process.env.EMAILJS_PUBLIC_KEY,
          template_params: {
            message: `Scheduled check ran successfully at ${new Date().toISOString()}\n${msg}`
          },
          accessToken: process.env.EMAILJS_PRIVATE_KEY
        });
      }
    }

    logger.info(`Checked for errors - ${errors.length} stations newly offline.`, {
      service: 'errors'
    });
  } catch (error) {
    logger.error('An error occurred while checking for station errors', { service: 'errors' });
    logger.error(error, { service: 'errors' });
    return null;
  }
}

export async function updateKeys() {
  try {
    const stations = await Station.find({
      type: 'harvest',
      externalId: { $in: ['10243_113703', '11433_171221'] }
    });
    if (!stations.length) {
      logger.error('No stations found.', { service: 'keys' });
      return null;
    }

    if (stations.length == 2) {
      const { headers } = await axios.post(
        'https://live.harvest.com/?sid=10243',
        {
          username: process.env.HARVEST_REALJOURNEYS_USERNAME,
          password: process.env.HARVEST_REALJOURNEYS_PASSWORD,
          submit: 'Login'
        },
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          maxRedirects: 0,
          validateStatus: (status) => {
            return status == 302;
          }
        }
      );

      const cookies = headers['set-cookie'];
      const regex = /PHPSESSID=[0-9a-zA-Z]+;\s/g;
      if (cookies && cookies.length && cookies[0] && cookies[0].match(regex)) {
        const cookie = cookies[0].slice(0, cookies[0].indexOf('; '));
        if (cookie) {
          for (const s of stations) {
            s.harvestCookie = cookie;
            await s.save();
          }
        }
      }
    }
  } catch (error) {
    logger.error('An error occurred while updating keys', { service: 'keys' });
    logger.error(error, { service: 'keys' });
    return null;
  }
}

export async function removeOldData() {
  try {
    const stations = await Station.find({});
    if (!stations.length) {
      logger.error('No stations found.', { service: 'cleanup' });
      return null;
    }

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    for (const s of stations) {
      await Station.updateOne({ _id: s._id }, { $pull: { data: { time: { $lte: cutoff } } } });
    }
  } catch (error) {
    logger.error('An error occurred while removing old data', { service: 'cleanup' });
    logger.error(error, { service: 'cleanup' });
    return null;
  }
}
