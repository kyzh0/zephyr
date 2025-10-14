import https from 'https';
import axios from 'axios';
import { parse } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import fs from 'fs/promises';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

import logger from '../lib/log.js';

import { Station } from '../models/stationModel.js';
import { Output } from '../models/outputModel.js';

function getFlooredTime(interval) {
  // floor data timestamp to "interval" mins
  let date = new Date();
  let rem = date.getMinutes() % interval;
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

async function processHarvestResponse(sid, configId, graphId, traceId, cookie) {
  let date = new Date();
  let utcYear = date.getUTCFullYear();
  let utcMonth = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  let utcDay = date.getUTCDate().toString().padStart(2, '0');
  let utcHours = date.getUTCHours().toString().padStart(2, '0');
  let utcMins = date.getUTCMinutes().toString().padStart(2, '0');
  const dateTo = `${utcYear}-${utcMonth}-${utcDay}T${utcHours}:${utcMins}:00.000`;

  date = new Date(date.getTime() - 40 * 60 * 1000); // get data for last 40 min
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
      `https://data1.harvest.com//php/site_graph_functions.php?retrieve_trace=&req_ref=${sid}_${configId}_${graphId}`,
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

    if (data) {
      if (Array.isArray(data) && data.length) {
        // if data format is array
        const d = data[0].data;
        if (d && d.length) {
          const d1 = d[d.length - 1];
          return d1.data_value;
        }
      } else {
        // else data format is object
        let d = null;
        if (data['1']) d = data['1'].data;
        else if (data['2']) d = data['2'].data;
        else if (data['3']) d = data['3'].data;

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

async function getFenzHarvestStationIds() {
  const ids = [];
  try {
    let { data } = await axios.get(
      `https://live.harvest.com/api.php?output_type=application/json&command_type=get_user_site_list&api_key=${process.env.HARVEST_FENZ_KEY}`
    );

    if (data) {
      if (data.sites && data.sites.length) {
        for (const s of data.sites) {
          ids.push(s.site_id);
        }
      }

      // get next 200
      if (data['_links'] && data['_links'].next) {
        ({ data } = await axios.get(
          `https://live.harvest.com/api.php?output_type=application/json&command_type=get_user_site_list&api_key=${process.env.HARVEST_FENZ_KEY}&start=200`
        ));

        if (data && data.sites && data.sites.length) {
          for (const s of data.sites) {
            ids.push(s.site_id);
          }
        }
      }
    }
  } catch {
    logger.warn('An error occured while fetching fenz harvest ids', {
      service: 'station',
      type: 'harvest'
    });
  }

  return ids;
}

async function getFenzHarvestData(stationId, windAvgId, windGustId, windDirId, tempId) {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  const windAvgTraceId = windAvgId.split('_')[1];
  const windGustTraceId = windGustId.split('_')[1];
  const windDirTraceId = windDirId.split('_')[1];
  const tempTraceId = tempId.split('_')[1];

  try {
    // wind avg
    let { data } = await axios.get(
      `https://live.harvest.com/api.php?output_type=application/json&command_type=get_data&api_key=${process.env.HARVEST_FENZ_KEY}&trace_id=${windAvgTraceId}`
    );
    if (data && data.data && data.data.length === 1) {
      const unix = Number(data.data[0].unix_time.replace('.000', ''));
      const ts = new Date(unix * 1000);
      // skip data older than 40 mins
      if (Date.now() - ts.getTime() < 40 * 60 * 1000) {
        windAverage = data.data[0].data_value;
      }
    }

    // wind gust
    ({ data } = await axios.get(
      `https://live.harvest.com/api.php?output_type=application/json&command_type=get_data&api_key=${process.env.HARVEST_FENZ_KEY}&trace_id=${windGustTraceId}`
    ));
    if (data && data.data && data.data.length === 1) {
      const unix = Number(data.data[0].unix_time.replace('.000', ''));
      const ts = new Date(unix * 1000);
      // skip data older than 40 mins
      if (Date.now() - ts.getTime() < 40 * 60 * 1000) {
        windGust = data.data[0].data_value;
      }
    }

    // wind direction
    ({ data } = await axios.get(
      `https://live.harvest.com/api.php?output_type=application/json&command_type=get_data&api_key=${process.env.HARVEST_FENZ_KEY}&trace_id=${windDirTraceId}`
    ));
    if (data && data.data && data.data.length === 1) {
      const unix = Number(data.data[0].unix_time.replace('.000', ''));
      const ts = new Date(unix * 1000);
      // skip data older than 40 mins
      if (Date.now() - ts.getTime() < 40 * 60 * 1000) {
        windBearing = data.data[0].data_value;
      }
    }

    // temperature
    ({ data } = await axios.get(
      `https://live.harvest.com/api.php?output_type=application/json&command_type=get_data&api_key=${process.env.HARVEST_FENZ_KEY}&trace_id=${tempTraceId}`
    ));
    if (data && data.data && data.data.length === 1) {
      const unix = Number(data.data[0].unix_time.replace('.000', ''));
      const ts = new Date(unix * 1000);
      // skip data older than 40 mins
      if (Date.now() - ts.getTime() < 40 * 60 * 1000) {
        temperature = data.data[0].data_value;
      }
    }
  } catch {
    logger.warn(`An error occured while fetching data for fenz harvest - ${stationId}`, {
      service: 'station',
      type: 'harvest'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getHarvestData(stationId, windAvgId, windGustId, windDirId, tempId, cookie) {
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
    windAverage = await processHarvestResponse(sid, configId, ids[0], ids[1], cookie);
  }

  // wind gust
  ids = windGustId.split('_');
  if (ids.length == 2) {
    windGust = await processHarvestResponse(sid, configId, ids[0], ids[1], cookie);
  }

  // wind direction
  ids = windDirId.split('_');
  if (ids.length == 2) {
    windBearing = await processHarvestResponse(sid, configId, ids[0], ids[1], cookie);
  }

  // temperature
  ids = tempId.split('_');
  if (ids.length == 2) {
    temperature = await processHarvestResponse(sid, configId, ids[0], ids[1], cookie);
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
      `https://www.metservice.com/publicData/webdata/module/weatherStationCurrentConditions/${stationId}`,
      {
        headers: {
          Connection: 'keep-alive'
        }
      }
    );
    const wind = data.observations.wind;
    if (wind && wind.length && wind[0]) {
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

    const temp = data.observations.temperature;
    if (temp && temp.length && temp[0]) {
      temperature = temp[0].current;
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

async function getAttentisData() {
  const result = [];
  try {
    const { data } = await axios.get('https://api.attentistechnology.com/sensor-overview', {
      headers: { Authorization: `Bearer ${process.env.ATTENTIS_KEY}`, Connection: 'keep-alive' }
    });
    if (data.data && data.data.weather_readings) {
      for (var key of Object.keys(data.data.weather_readings)) {
        const d = data.data.weather_readings[key];
        result.push({
          id: key,
          data: {
            windAverage: d.wind_speed,
            windGust: d.wind_gust_speed,
            windBearing: d.wind_direction,
            temperature: d.air_temp
          }
        });
      }
    }
  } catch (error) {
    logger.warn(`An error occured while fetching data for attentis`, {
      service: 'station',
      type: 'attentis'
    });
    logger.warn(error);
  }

  return result;
}

async function getWowData(stationId) {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { data } = await axios.get(
      `https://wow.metoffice.gov.uk/observations/details/tableviewdata/${stationId}/details/${formatInTimeZone(new Date(), 'UTC', 'yyyy-MM-dd')}`,
      {
        headers: { Connection: 'keep-alive' }
      }
    );
    if (data.Observations && data.Observations.length) {
      const d = data.Observations[0];
      if (d) {
        const time = new Date(d.ReportEndDateTime);
        // only update if data is <15min old
        if (Date.now() - time.getTime() < 15 * 60 * 1000) {
          windAverage = d.windSpeed_MetrePerSecond * 3.6;
          windGust = d.windGust_MetrePerSecond * 3.6;
          windBearing = d.windDirection;
          temperature = d.dryBulbTemperature_Celsius;
        }
      }
    }
  } catch (error) {
    logger.warn(`An error occured while fetching data for metoffice wow - ${stationId}`, {
      service: 'station',
      type: 'wow'
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
      type: 'cwu'
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
      type: 'wp'
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
            if (!isNaN(temp)) windAverage = Math.round(temp * 1.852 * 100) / 100;
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
            if (!isNaN(temp)) windGust = Math.round(temp * 1.852 * 100) / 100;
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
      type: 'po'
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
      type: 'wu'
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
          Connection: 'keep-alive',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0'
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
      type: 'tempest'
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
      windAverage = Math.round(data.wind_avg * 1.852 * 100) / 100;
      windGust = Math.round(data.wind_max * 1.852 * 100) / 100;
      windBearing = data.wind_direction;
      temperature = data.temperature;
    }
  } catch (error) {
    logger.warn(`An error occured while fetching data for windguru - ${stationId}`, {
      service: 'station',
      type: 'windguru'
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
        windAverage = Math.round(data[0].speed_kn * 1.852 * 100) / 100; // data is in kt
        windGust = Math.round(data[0].gust_kn * 1.852 * 100) / 100;
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
        windAverage = Math.round(data[0].WindSpd_01MnAvg * 1.852 * 100) / 100; // data is in kt
        windGust = Math.round(data[0].WindGst_01MnMax * 1.852 * 100) / 100;
        windBearing = Number(data[0].WindDir_01MnAvg);
      }
    }
  } catch (error) {
    logger.warn(`An error occured while fetching data for centreport - ${stationId}`, {
      service: 'station',
      type: 'cp'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getSofarOceanData(stationId) {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { data } = await axios.post(
      'https://api.sofarocean.com/fetch/devices/',
      {
        devices: [{ spotterId: stationId }]
      },
      {
        headers: {
          Connection: 'keep-alive',
          view_token: process.env.SOFAROCEAN_KEY
        }
      }
    );
    if (data && data.data) {
      const currentConditions = data.data.currentConditions;
      if (currentConditions && currentConditions.length === 1) {
        const lastUpdate = new Date(currentConditions[0].timeLastUpdatedUTC).getTime();
        // only update if data is less than 15 min old
        if (Date.now() - lastUpdate < 15 * 60 * 1000) {
          temperature = currentConditions[0].temperature;
          const wind = currentConditions[0].wind;
          if (wind) {
            windAverage = wind.speed * 3.6; // m/s
            windBearing = wind.direction;
          }
        }
      }
    }
  } catch (error) {
    logger.warn(`An error occured while fetching data for sofarocean - ${stationId}`, {
      service: 'station',
      type: 'sfo'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getNavigatusData(stationId) {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    if (stationId.toUpperCase() === 'NZQNWX') {
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
    } else if (stationId.toUpperCase() === 'OMARAMA') {
      const { data } = await axios.get('https://omarama.navigatus.aero/get_new_data/3', {
        headers: {
          Connection: 'keep-alive'
        }
      });
      if (data) {
        windAverage = Math.round(data.average_speed * 1.852 * 100) / 100; // kt
        windGust = Math.round(data.max_gust * 1.852 * 100) / 100;
        windBearing = data.average_dir;

        if (data.wind_data) {
          temperature = data.wind_data.temperature;
        }
      }
    } else if (stationId.toUpperCase() === 'SLOPEHILL') {
      const { data } = await axios.get('https://nzqnwx2.navigatus.aero/frontend/json_latest_data', {
        headers: {
          Connection: 'keep-alive'
        }
      });
      if (data) {
        const lastUpdate = fromZonedTime(
          parse(data.date_local, 'yyyy-MM-dd HH:mm:ss', new Date()),
          'Pacific/Auckland'
        );
        // skip if data older than 20 min
        if (Date.now() - lastUpdate.getTime() < 20 * 60 * 1000) {
          windAverage = Math.round(data.wind_speed * 1.852 * 100) / 100; // kt
          windGust = Math.round(data.wind_gust * 1.852 * 100) / 100;
          windBearing = data.wind_direction;
          temperature = data.air_temperature;
        }
      }
    }
  } catch (error) {
    logger.warn(`An error occured while fetching data for navigatus - ${stationId}`, {
      service: 'station',
      type: 'navigatus'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getPredictWindData(stationId) {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { data } = await axios.get(
      'https://forecast.predictwind.com/observations/jardines.json' +
        `?api_key=${process.env.PREDICTWIND_KEY}`,
      {
        headers: {
          Connection: 'keep-alive'
        }
      }
    );

    if (data && data.samples.length) {
      for (const s of data.samples) {
        if (s.id.toString() === stationId) {
          windAverage = Math.round(s.tws * 1.852 * 100) / 100;
          windGust = Math.round(s.gust * 1.852 * 100) / 100;
          windBearing = s.twd;
          break;
        }
      }
    }
  } catch (error) {
    logger.warn('An error occured while fetching data for predictwind', {
      service: 'station',
      type: 'pw'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getEcowittData(stationId) {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { data } = await axios.get(
      `https://api.ecowitt.net/api/v3/device/real_time?api_key=${process.env.ECOWITT_API_KEY}&application_key=${process.env.ECOWITT_APPLICATION_KEY}&mac=${stationId}&wind_speed_unitid=7&temp_unitid=1`,
      {
        headers: {
          Connection: 'keep-alive'
        }
      }
    );

    const timeNow = Math.round(Date.now() / 1000); // epoch time in s
    if (data && data.data) {
      const d = data.data;
      if (d.wind) {
        const w = d.wind;
        if (w.wind_speed) {
          if (timeNow - Number(w.wind_speed.time) < 20 * 60) {
            windAverage = Number(w.wind_speed.value);
          }
        }
        if (w.wind_gust) {
          if (timeNow - Number(w.wind_gust.time) < 20 * 60) {
            windGust = Number(w.wind_gust.value);
          }
        }
        if (w.wind_direction) {
          if (timeNow - Number(w.wind_direction.time) < 20 * 60) {
            windBearing = Number(w.wind_direction.value);
          }
        }
      }
      if (d.outdoor && d.outdoor.temperature) {
        if (timeNow - Number(d.outdoor.temperature.time) < 20 * 60) {
          temperature = Number(d.outdoor.temperature.value);
        }
      }
    }
  } catch (error) {
    logger.warn('An error occured while fetching data for ecowitt', {
      service: 'station',
      type: 'ecowitt'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getHbrcData(stationId) {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    // ignore 'invalid' self-signed cert
    const agent = new https.Agent({
      rejectUnauthorized: false,
      requestCert: false,
      agent: false
    });

    // avg
    let { data } = await axios.get(
      `https://data.hbrc.govt.nz/Envirodata/EMAR.hts?Service=Hilltop&Request=GetData&Site=${stationId}&Measurement=Average%20Wind%20Speed&Format=JSON`,
      {
        headers: {
          Connection: 'keep-alive'
        },
        httpsAgent: agent
      }
    );

    if (data && data.Data && data.Data.length) {
      // ignore old data
      const lastUpdate = new Date(data.Data[0].t);
      if (Date.now() - lastUpdate.getTime() < 40 * 60 * 1000) {
        windAverage = Number(data.Data[0].v);
      }
    }

    // gust
    ({ data } = await axios.get(
      `https://data.hbrc.govt.nz/Envirodata/EMAR.hts?Service=Hilltop&Request=GetData&Site=${stationId}&Measurement=Maximum%20Wind%20Speed&Format=JSON`,
      {
        headers: {
          Connection: 'keep-alive'
        },
        httpsAgent: agent
      }
    ));

    if (data && data.Data && data.Data.length) {
      const lastUpdate = new Date(data.Data[0].t);
      if (Date.now() - lastUpdate.getTime() < 40 * 60 * 1000) {
        windGust = Number(data.Data[0].v);
      }
    }

    // direction
    ({ data } = await axios.get(
      `https://data.hbrc.govt.nz/Envirodata/EMAR.hts?Service=Hilltop&Request=GetData&Site=${stationId}&Measurement=Average%20Wind%20Direction&Format=JSON`,
      {
        headers: {
          Connection: 'keep-alive'
        },
        httpsAgent: agent
      }
    ));

    if (data && data.Data && data.Data.length) {
      const lastUpdate = new Date(data.Data[0].t);
      if (Date.now() - lastUpdate.getTime() < 40 * 60 * 1000) {
        windBearing = Number(data.Data[0].v);
      }
    }

    // temperature
    ({ data } = await axios.get(
      `https://data.hbrc.govt.nz/Envirodata/EMAR.hts?Service=Hilltop&Request=GetData&Site=${stationId}&Measurement=Average%20Air%20Temperature&Format=JSON`,
      {
        headers: {
          Connection: 'keep-alive'
        },
        httpsAgent: agent
      }
    ));

    if (data && data.Data && data.Data.length) {
      const lastUpdate = new Date(data.Data[0].t);
      if (Date.now() - lastUpdate.getTime() < 40 * 60 * 1000) {
        temperature = Number(data.Data[0].v);
      }
    }
  } catch (error) {
    logger.warn('An error occured while fetching data for hbrc', {
      service: 'station',
      type: 'hbrc'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getAucklandCouncilData(stationId) {
  let windAverage = null;
  const windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { data } = await axios.get(
      `https://coastalmonitoringac.netlify.app/.netlify/functions/obscapeProxy?station=${stationId}&parameters=Tp,Uw,Uwdir,invalid&latest=1`,
      {
        headers: {
          Connection: 'keep-alive'
        }
      }
    );

    if (data && data.data.length === 1) {
      const d = data.data[0];
      // ignore data older than 40 mins
      if (d.invalid === '0' && Date.now() - Number(d.time) * 1000 < 40 * 60 * 1000) {
        windAverage = d.Uw * 3.6;
        windBearing = d.Uwdir;
        temperature = d.Tp;
      }
    }
  } catch (error) {
    logger.warn('An error occured while fetching data for auckland council', {
      service: 'station',
      type: 'ac'
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
    // dates are always in NZST ignoring daylight savings
    const dateTo = new Date();
    const dateFrom = new Date(dateTo.getTime() - 30 * 60 * 1000);
    const url =
      'https://hilltop.gw.govt.nz/Data.hts/?Service=Hilltop&Request=GetData' +
      `&Site=${encodeURIComponent(stationId)}` +
      `&From=${encodeURIComponent(formatInTimeZone(dateFrom, '+12', 'yyyy-MM-dd HH:mm:ss'))}` +
      `&To=${encodeURIComponent(formatInTimeZone(dateTo, '+12', 'yyyy-MM-dd HH:mm:ss'))}`;

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
      type: 'gw'
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
      windAverage = Math.round(data[0].windspd_01mnavg * 1.852 * 100) / 100; // data is in kt
      windGust = Math.round(data[0].windgst_01mnmax * 1.852 * 100) / 100;
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
      type: 'lpc'
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
        windAverage = Math.round(avg * 1.852 * 100) / 100; // data is in kt
      }
      const gust = data.current.windGust
        ? Number(data.current.windspeed.replace(' knots', ''))
        : null;
      if (gust != null && !isNaN(gust)) {
        windGust = Math.round(gust * 1.852 * 100) / 100;
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
      type: 'mpyc'
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
      type: 'mfhb'
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
      type: 'mrc'
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
      type: 'wainui'
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
    const worker = await createWorker('eng', 1, {
      errorHandler: (err) => {
        logger.warn(err);
        return err;
      }
    });

    // sometimes img changes size
    const meta = await sharp(imgBuff).metadata();

    // avg
    let croppedBuf = await sharp(imgBuff)
      .extract({
        left: meta.width > 1000 ? 850 : 680,
        top: 170,
        width: meta.width > 1000 ? 175 : 140,
        height: 50
      })
      .toBuffer();
    let path = `${dir}/primeportavg.jpg`;
    await fs.writeFile(path, croppedBuf);

    const reg = /[^0-9.]/g;
    let ret = await worker.recognize(path);
    const textAvg = ret.data.text.replace(reg, '');

    // gust
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: meta.width > 1000 ? 850 : 680,
        top: 30,
        width: meta.width > 1000 ? 175 : 140,
        height: 50
      })
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
      .extract({
        left: meta.width > 1000 ? 845 : 675,
        top: 250,
        width: meta.width > 1000 ? 180 : 145,
        height: 50
      })
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
      type: 'prime'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getPortersData() {
  const result = [];
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    // fetch img
    const response = await axios.get('https://portersalpineresort.com/Screen.png', {
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
    const worker = await createWorker('eng', 1, {
      errorHandler: (err) => {
        logger.warn(err);
        return err;
      }
    });

    // BASE AREA WEATHER STATION
    // avg
    let croppedBuf = await sharp(imgBuff)
      .extract({
        left: 195,
        top: 7115,
        width: 70,
        height: 20
      })
      .toBuffer();
    let path = `${dir}/portersbaseavg.jpg`;
    await fs.writeFile(path, croppedBuf);

    const reg = /[^0-9.]/g;
    let ret = await worker.recognize(path);
    let textAvg = ret.data.text.replace(reg, '');

    // gust
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: 195,
        top: 7155,
        width: 70,
        height: 20
      })
      .toBuffer();
    path = `${dir}/portersbasegust.jpg`;
    await fs.writeFile(path, croppedBuf);

    ret = await worker.recognize(path);
    let textGust = ret.data.text.replace(reg, '');

    windAverage = isNaN(textAvg) ? 0 : Number(textAvg);
    windGust = isNaN(textGust) ? 0 : Number(textGust);
    if (windGust < windAverage) windGust = null; // sometimes ocr fails for gust PORTERS BASE

    // direction
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: 275,
        top: 7115,
        width: 70,
        height: 20
      })
      .toBuffer();
    path = `${dir}/portersbasedir.jpg`;
    await fs.writeFile(path, croppedBuf);

    ret = await worker.recognize(path);
    windBearing = Number(ret.data.text.slice(0, 3).replace(reg, ''));

    // temperature
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: 195,
        top: 7018,
        width: 70,
        height: 20
      })
      .toBuffer();
    path = `${dir}/portersbasetemp.jpg`;
    await fs.writeFile(path, croppedBuf);

    ret = await worker.recognize(path);
    let textTemperature = ret.data.text.replace(reg, '');
    if (textTemperature.length && !textTemperature.includes('.')) {
      // sometimes ocr misses a .
      // temperature is always 1dp here
      textTemperature = `${textTemperature.slice(0, -1)}.${textTemperature.slice(-1)}`;
    }
    temperature = Number(textTemperature);
    result.push({
      id: 'base',
      data: {
        windAverage,
        windGust,
        windBearing,
        temperature
      }
    });

    // T-BAR 2 WEATHER STATION
    // avg
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: 478,
        top: 7112,
        width: 70,
        height: 20
      })
      .toBuffer();
    path = `${dir}/porterstbaravg.jpg`;
    await fs.writeFile(path, croppedBuf);

    ret = await worker.recognize(path);
    textAvg = ret.data.text.replace(reg, '');

    // gust
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: 478,
        top: 7152,
        width: 70,
        height: 20
      })
      .toBuffer();
    path = `${dir}/porterstbargust.jpg`;
    await fs.writeFile(path, croppedBuf);

    ret = await worker.recognize(path);
    textGust = ret.data.text.replace(reg, '');

    windAverage = isNaN(textAvg) ? 0 : Number(textAvg);
    windGust = isNaN(textGust) ? 0 : Number(textGust);

    // direction
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: 558,
        top: 7113,
        width: 70,
        height: 20
      })
      .toBuffer();
    path = `${dir}/porterstbardir.jpg`;
    await fs.writeFile(path, croppedBuf);

    ret = await worker.recognize(path);
    windBearing = Number(ret.data.text.slice(0, 3).replace(reg, ''));

    // temperature
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: 478,
        top: 7018,
        width: 70,
        height: 20
      })
      .toBuffer();
    path = `${dir}/porterstbartemp.jpg`;
    await fs.writeFile(path, croppedBuf);

    ret = await worker.recognize(path);
    textTemperature = ret.data.text.replace(reg, '');
    if (textTemperature.length && !textTemperature.includes('.')) {
      textTemperature = `${textTemperature.slice(0, -1)}.${textTemperature.slice(-1)}`;
    }
    temperature = Number(textTemperature);
    result.push({
      id: 'tbar',
      data: {
        windAverage,
        windGust,
        windBearing,
        temperature
      }
    });

    // RIDGELINE WEATHER STATION
    // avg
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: 760,
        top: 7112,
        width: 70,
        height: 20
      })
      .toBuffer();
    path = `${dir}/portersridgelineavg.jpg`;
    await fs.writeFile(path, croppedBuf);

    ret = await worker.recognize(path);
    textAvg = ret.data.text.replace(reg, '');

    // gust
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: 760,
        top: 7152,
        width: 70,
        height: 20
      })
      .toBuffer();
    path = `${dir}/portersridgelinegust.jpg`;
    await fs.writeFile(path, croppedBuf);

    ret = await worker.recognize(path);
    textGust = ret.data.text.replace(reg, '');

    windAverage = isNaN(textAvg) ? 0 : Number(textAvg);
    windGust = isNaN(textGust) ? 0 : Number(textGust);

    // direction
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: 842,
        top: 7111,
        width: 70,
        height: 20
      })
      .toBuffer();
    path = `${dir}/portersridgelinedir.jpg`;
    await fs.writeFile(path, croppedBuf);

    ret = await worker.recognize(path);
    windBearing = Number(ret.data.text.slice(0, 3).replace(reg, ''));

    // temperature
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: 760,
        top: 7018,
        width: 70,
        height: 20
      })
      .toBuffer();
    path = `${dir}/portersridgelinetemp.jpg`;
    await fs.writeFile(path, croppedBuf);

    ret = await worker.recognize(path);
    textTemperature = ret.data.text.replace(reg, '');
    if (textTemperature.length && !textTemperature.includes('.')) {
      textTemperature = `${textTemperature.slice(0, -1)}.${textTemperature.slice(-1)}`;
    }
    temperature = Number(textTemperature);
    result.push({
      id: 'ridgeline',
      data: {
        windAverage,
        windGust,
        windBearing,
        temperature
      }
    });

    // cleanup
    await worker.terminate();
    await fs.rm(dir, { recursive: true, force: true });
  } catch (error) {
    logger.warn('An error occured while fetching data for porters', {
      service: 'station',
      type: 'porters'
    });
  }

  return result;
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
      type: 'wl'
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
      type: 'hw'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getWhanganuiInletData() {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { data } = await axios.get('http://whanganuiinletweather.info/', {
      headers: {
        Connection: 'keep-alive'
      }
    });
    if (data.length) {
      let skipUpdate = true;

      // check last update
      let startStr = '<div class="subHeaderRight">Updated: ';
      let i = data.indexOf(startStr);
      if (i >= 0) {
        const j = data.indexOf('</div>', i + startStr.length);
        if (j > i) {
          const temp = data.slice(i + startStr.length, j);
          const lastUpdate = fromZonedTime(
            parse(temp, 'd/M/yyyy hh:mm aa', new Date()),
            'Pacific/Auckland'
          );
          // skip if data older than 20 min
          if (Date.now() - lastUpdate.getTime() < 20 * 60 * 1000) {
            skipUpdate = false;
          }
        }
      }

      if (skipUpdate) {
        return {
          windAverage,
          windGust,
          windBearing,
          temperature
        };
      }

      // wind avg + direction
      startStr = '<p class="sideBarTitle">Wind</p>';
      i = data.indexOf(startStr);
      if (i >= 0) {
        const startStr1 = '<li>Current: ';
        const j = data.indexOf(startStr1, i + startStr.length);
        if (j > i) {
          const k = data.indexOf(' ', j + startStr1.length);
          if (k > j) {
            const temp = Number(data.slice(j + startStr1.length, k).trim());
            if (!isNaN(temp)) windAverage = temp;

            const l = data.indexOf('</li>', k);
            if (l > k) {
              windBearing = getWindBearingFromDirection(data.slice(k, l).trim());
            }
          }
        }
      }

      // wind gust
      startStr = '<li>Gust: ';
      i = data.indexOf(startStr);
      if (i >= 0) {
        const j = data.indexOf(' ', i + startStr.length);
        if (j > i) {
          const temp = Number(data.slice(i + startStr.length, j).trim());
          if (!isNaN(temp)) windGust = temp;
        }
      }

      // temperature
      startStr = '<li>Now:';
      i = data.indexOf(startStr);
      if (i >= 0) {
        const j = data.indexOf('&nbsp;', i);
        if (j > i) {
          const temp = Number(data.slice(i + startStr.length, j).trim());
          if (!isNaN(temp)) temperature = temp;
        }
      }
    }
  } catch (error) {
    logger.warn('An error occured while fetching data for whanganui inlet', {
      service: 'station',
      type: 'wi'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getWSWRData() {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { data } = await axios.get('https://api.wswr.jkent.tech/weatherdata/mostrecent/60', {
      headers: {
        Connection: 'keep-alive'
      }
    });

    if (data && data.length) {
      const d = data[0];
      const time = new Date(`${d.record_time}.000Z`);
      if (Date.now() - time.getTime() < 20 * 60 * 1000) {
        windAverage = Math.round(d.windspd_10mnavg * 1.852 * 10) / 10;
        windGust = Math.round(d.windgst_10mnmax * 1.852 * 10) / 10;
        windBearing = d.winddir_10mnavg;
        temperature = d.airtemp_01mnavg;
      }
    }
  } catch (error) {
    logger.warn('An error occured while fetching data for wswr', {
      service: 'station',
      type: 'wswr'
    });
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getSouthPortData() {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  const temperature = null;

  try {
    const { data } = await axios.get(
      'https://southportvendor.marketsouth.co.nz/testAPI/getBaconWindData.php?_=1760437457410',
      {
        headers: {
          Connection: 'keep-alive'
        }
      }
    );

    if (data) {
      const time = fromZonedTime(
        parse(data.lastReading, 'yyyy-MM-dd HH:mm:ss', new Date()),
        'Pacific/Auckland'
      );
      if (Date.now() - time.getTime() < 20 * 60 * 1000) {
        windAverage = Math.round(data.AveSpeed * 1.852 * 10) / 10;
        windGust = Math.round(data.GustSpeed * 1.852 * 10) / 10;
        windBearing = Number(data.AveDirection);
      }
    }
  } catch (error) {
    logger.warn('An error occured while fetching data for sp', {
      service: 'station',
      type: 'sp'
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
    const query = { isHighResolution: { $ne: true }, isDisabled: { $ne: true } };
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

    const fenzHarvestStationIds = [];
    const attentisData = await getAttentisData();

    let portersData = [];
    const matches = stations.filter((s) => {
      return s.type === 'porters';
    });
    if (matches.length) portersData = await getPortersData();

    const date = getFlooredTime(10);
    for (const s of stations) {
      let data = null;
      if (source === 'harvest') {
        if (!fenzHarvestStationIds.length) {
          fenzHarvestStationIds.push(...(await getFenzHarvestStationIds()));
        }

        if (s.type === 'harvest') {
          const sid = Number(s.externalId.split('_')[0]);
          if (fenzHarvestStationIds.includes(sid)) {
            data = await getFenzHarvestData(
              s.externalId,
              s.harvestWindAverageId,
              s.harvestWindGustId,
              s.harvestWindDirectionId,
              s.harvestTemperatureId
            );
          } else {
            data = await getHarvestData(
              s.externalId,
              s.harvestWindAverageId,
              s.harvestWindGustId,
              s.harvestWindDirectionId,
              s.harvestTemperatureId,
              s.harvestCookie // station 10243,11433 needs PHPSESSID cookie for auth
            );
            if (sid === 10243 || sid === 11433) {
              // these stations are in kt
              if (data.windAverage) data.windAverage *= 1.852;
              if (data.windGust) data.windGust *= 1.852;
            }
          }
        }
      } else if (source === 'metservice') {
        if (s.type === 'metservice') {
          data = await getMetserviceData(s.externalId);
        }
      } else {
        if (s.type === 'attentis') {
          const d = attentisData.find((x) => x.id === s.externalId);
          if (d) data = d.data;
        } else if (s.type === 'wu') {
          data = await getWUndergroundData(s.externalId);
        } else if (s.type === 'wow') {
          data = await getWowData(s.externalId);
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
        } else if (s.type === 'sfo') {
          data = await getSofarOceanData(s.externalId);
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
        } else if (s.type === 'navigatus') {
          data = await getNavigatusData(s.externalId);
        } else if (s.type === 'pw') {
          data = await getPredictWindData(s.externalId);
        } else if (s.type === 'ecowitt') {
          data = await getEcowittData(s.externalId);
        } else if (s.type === 'hbrc') {
          data = await getHbrcData(s.externalId);
        } else if (s.type === 'ac') {
          data = await getAucklandCouncilData(s.externalId);
        } else if (s.type === 'lpc') {
          data = await getLpcData();
        } else if (s.type === 'mpyc') {
          data = await getMpycData();
        } else if (s.type === 'mfhb') {
          data = await getMfhbData();
        } else if (s.type === 'mrc') {
          data = await getMrcData();
        } else if (s.type === 'wainui') {
          data = await getWainuiData();
        } else if (s.type === 'prime') {
          data = await getPrimePortData();
        } else if (s.type === 'porters') {
          const d = portersData.find((x) => x.id === s.externalId);
          if (d) data = d.data;
        } else if (s.type === 'wl') {
          data = await getWeatherLinkData();
        } else if (s.type === 'hw') {
          data = await getHuttWeatherData();
        } else if (s.type === 'wi') {
          data = await getWhanganuiInletData();
        } else if (s.type === 'wswr') {
          data = await getWSWRData();
        } else if (s.type === 'sp') {
          data = await getSouthPortData();
        }
      }

      if (data) {
        logger.info(`${s.type} data updated${s.externalId ? ` - ${s.externalId}` : ''}`, {
          service: 'station',
          type: s.type
        });
        logger.info(JSON.stringify(data), { service: 'station', type: s.type });
        await saveData(s, data, date);
      }
    }
  } catch (error) {
    logger.error(`An error occurred while fetching ${source} station data`, {
      service: 'station',
      type: source
    });
    logger.error(error, { service: 'station', type: source });
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
    const stations = await Station.find(
      { type: 'holfuy', isHighResolution: { $ne: true }, isDisabled: { $ne: true } },
      { data: 0 }
    );
    if (!stations.length) {
      logger.error('No holfuy stations found.', { service: 'station', type: 'holfuy' });
      return null;
    }

    const { data } = await axios.get(
      `https://api.holfuy.com/live/?pw=${process.env.HOLFUY_KEY}&m=JSON&tu=C&su=km/h&s=all`,
      {
        headers: {
          Connection: 'keep-alive'
        }
      }
    );

    const date = getFlooredTime(10);
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
    var date = getFlooredTime(10);
    const stations = await Station.find({ isDisabled: { $ne: true } }, { data: 0 });
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
        elevation: s.elevation,
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

    const urlPrefix =
      process.env.NODE_ENV === 'production' ? 'https://fs.zephyrapp.nz/' : 'http://localhost:5000/';
    const output = new Output({
      time: date,
      url: `${urlPrefix}${path.replace('public/', '')}`
    });
    await output.save();
  } catch (error) {
    logger.error('An error occurred while processing json output', { service: 'json' });
    logger.error(error, { service: 'json' });
  }
}

// selected stations have 2 min resolution
export async function highResolutionStationWrapper() {
  try {
    const stations = await Station.find(
      { isHighResolution: true, isDisabled: { $ne: true } },
      {
        _id: 1,
        name: 1,
        type: 1,
        elevation: 1,
        location: 1,
        externalId: 1,
        harvestWindAverageId: 1,
        harvestWindGustId: 1,
        harvestWindDirectionId: 1,
        harvestTemperatureId: 1,
        data: {
          $slice: [
            {
              $sortArray: { input: '$data', sortBy: { time: -1 } }
            },
            1 // include latest data record
          ]
        }
      }
    );
    if (!stations.length) {
      logger.error(`No high resolution stations found.`, {
        service: 'station',
        type: 'hr'
      });
      return null;
    }

    const holfuyResponse = await axios.get(
      `https://api.holfuy.com/live/?pw=${process.env.HOLFUY_KEY}&m=JSON&tu=C&su=km/h&s=all`,
      {
        headers: {
          Connection: 'keep-alive'
        }
      }
    );

    const json = [];
    const date = getFlooredTime(2);
    for (const s of stations) {
      if (!s.data[0] || date.getTime() - new Date(s.data[0].time).getTime() >= 3 * 60 * 1000) {
        await Station.updateOne(
          { _id: s._id },
          {
            $push: {
              data: {
                time: new Date(date.getTime() - 2 * 60 * 1000),
                windAverage: null,
                windGust: null,
                windBearing: null,
                temperature: null
              }
            }
          }
        );
      }

      let data = null;
      if (s.type === 'harvest') {
        data = await getHarvestData(
          s.externalId,
          s.harvestWindAverageId,
          s.harvestWindGustId,
          s.harvestWindDirectionId,
          s.harvestTemperatureId
        );
      } else if (s.type === 'holfuy') {
        const matches = holfuyResponse.data.measurements.filter((m) => {
          return m.stationId.toString() === s.externalId;
        });
        if (matches.length == 1) {
          const wind = matches[0].wind;
          data = {
            windAverage: wind?.speed ?? null,
            windGust: wind?.gust ?? null,
            windBearing: wind?.direction ?? null,
            temperature: matches[0]?.temperature ?? null
          };
        } else {
          data = await getHolfuyData(s.externalId);
        }
      } else if (s.type === 'metservice') {
        data = await getMetserviceData(s.externalId);
      }

      if (data) {
        logger.info(`${s.type} data updated${s.externalId ? ` - ${s.externalId}` : ''}`, {
          service: 'station',
          type: 'hr'
        });
        logger.info(JSON.stringify(data), { service: 'station', type: 'hr' });
        await saveData(s, data, date);
      }

      json.push({
        id: s._id,
        name: s.name,
        type: s.type,
        elevation: s.elevation,
        coordinates: {
          lat: s.location.coordinates[1],
          lon: s.location.coordinates[0]
        },
        timestamp: date.getTime() / 1000,
        wind: {
          average: data?.windAverage ?? null,
          gust: data?.windGust ?? null,
          bearing: data?.windBearing ?? null
        },
        temperature: data?.temperature ?? null
      });
    }

    // export json
    json.sort((a, b) => {
      return cmp(a.type, b.type) || cmp(a.name, b.name);
    });
    const dir = `public/data/hr/${formatInTimeZone(date, 'UTC', 'yyyy/MM/dd')}`;
    await fs.mkdir(dir, { recursive: true });
    const path = `${dir}/zephyr-scrape-${date.getTime() / 1000}.json`;
    await fs.writeFile(path, JSON.stringify(json));
    logger.info(`File created - ${path}`, { service: 'json' });

    const urlPrefix =
      process.env.NODE_ENV === 'production' ? 'https://fs.zephyrapp.nz/' : 'http://localhost:5000/';
    const output = new Output({
      time: date,
      url: `${urlPrefix}${path.replace('public/', '')}`,
      isHighResolution: true
    });
    await output.save();
  } catch (error) {
    logger.error(`An error occurred while fetching high resolution station data`, {
      service: 'station',
      type: 'hr'
    });
    logger.error(error, { service: 'station', type: 'hr' });
    return null;
  }
}

export async function checkForMissedReadings() {
  try {
    const stations = await Station.find(
      { isHighResolution: { $ne: true }, isDisabled: { $ne: true } },
      {
        _id: 1,
        type: 1,
        externalId: 1,
        harvestWindAverageId: 1,
        harvestWindGustId: 1,
        harvestWindDirectionId: 1,
        harvestTemperatureId: 1,
        harvestCookie: 1,
        gwWindAverageFieldName: 1,
        gwWindGustFieldName: 1,
        gwWindBearingFieldName: 1,
        gwTemperatureFieldName: 1,
        data: {
          $slice: [
            {
              $sortArray: { input: '$data', sortBy: { time: -1 } }
            },
            1 // include latest data record
          ]
        }
      }
    );
    if (!stations.length) {
      logger.error('No stations found.', { service: 'miss' });
      return null;
    }

    const date = getFlooredTime(10);
    const stationsToRescrape = [];
    for (const s of stations) {
      // check if latest data record is missing
      if (!s.data[0] || date.getTime() - new Date(s.data[0].time).getTime() >= 10 * 60 * 1000) {
        stationsToRescrape.push(s);
      }
    }

    let portersData = [];
    const matches = stationsToRescrape.filter((s) => {
      return s.type === 'porters';
    });
    if (matches.length) portersData = await getPortersData();

    let attentisData = [];
    const matches1 = stationsToRescrape.filter((s) => {
      return s.type === 'attentis';
    });
    if (matches1.length) attentisData = await getAttentisData();

    for (const s of stationsToRescrape) {
      let data = null;
      if (s.type === 'harvest') {
        data = await getHarvestData(
          s.externalId,
          s.harvestWindAverageId,
          s.harvestWindGustId,
          s.harvestWindDirectionId,
          s.harvestTemperatureId,
          s.harvestCookie // station 10243,11433 needs PHPSESSID cookie for auth
        );
        const sid = Number(s.externalId.split('_')[0]);
        if (sid === 10243 || sid === 11433) {
          // these stations are in kt
          if (data.windAverage) data.windAverage *= 1.852;
          if (data.windGust) data.windGust *= 1.852;
        }
      } else if (s.type === 'metservice') {
        data = await getMetserviceData(s.externalId);
      } else if (s.type === 'holfuy') {
        data = await getHolfuyData(s.externalId);
      } else if (s.type === 'attentis') {
        const d = attentisData.find((x) => x.id === s.externalId);
        if (d) data = d.data;
      } else if (s.type === 'wu') {
        data = await getWUndergroundData(s.externalId);
      } else if (s.type === 'wow') {
        data = await getWowData(s.externalId);
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
      } else if (s.type === 'sfo') {
        data = await getSofarOceanData(s.externalId);
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
      } else if (s.type === 'navigatus') {
        data = await getNavigatusData(s.externalId);
      } else if (s.type === 'pw') {
        data = await getPredictWindData(s.externalId);
      } else if (s.type === 'ecowitt') {
        data = await getEcowittData(s.externalId);
      } else if (s.type === 'hbrc') {
        data = await getHbrcData(s.externalId);
      } else if (s.type === 'ac') {
        data = await getAucklandCouncilData(s.externalId);
      } else if (s.type === 'lpc') {
        data = await getLpcData();
      } else if (s.type === 'mpyc') {
        data = await getMpycData();
      } else if (s.type === 'mfhb') {
        data = await getMfhbData();
      } else if (s.type === 'mrc') {
        data = await getMrcData();
      } else if (s.type === 'wainui') {
        data = await getWainuiData();
      } else if (s.type === 'prime') {
        data = await getPrimePortData();
      } else if (s.type === 'porters') {
        const d = portersData.find((x) => x.id === s.externalId);
        if (d) data = d.data;
      } else if (s.type === 'wl') {
        data = await getWeatherLinkData();
      } else if (s.type === 'hw') {
        data = await getHuttWeatherData();
      } else if (s.type === 'wi') {
        data = await getWhanganuiInletData();
      } else if (s.type === 'wswr') {
        data = await getWSWRData();
      } else if (s.type === 'sp') {
        data = await getSouthPortData();
      }

      if (data) {
        logger.info(
          `missed reading - ${s.type} data updated${s.externalId ? ` - ${s.externalId}` : ''}`,
          {
            service: 'miss',
            type: s.type
          }
        );
        logger.info(JSON.stringify(data), {
          service: 'miss',
          type: s.type
        });
        await saveData(s, data, date);
      }
    }
  } catch (error) {
    logger.error('An error occurred while checking for missed readings', { service: 'miss' });
    logger.error(error, { service: 'miss' });
    return null;
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
    const stations = await Station.find({ isDisabled: { $ne: true } });
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

        // check that data exists up to 60min before current time
        if (timeNow - new Date(data[0].time).getTime() <= 60 * 60 * 1000) {
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
      const singleStations = ['lpc', 'mpyc', 'navigatus', 'mfhb', 'mrc', 'wainui', 'pw'];
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

// export async function updateKeys() {
//   try {
//     const stations = await Station.find({
//       type: 'harvest',
//       harvestCookie: { $ne: null }
//     });
//     if (!stations.length) {
//       logger.error('No stations found.', { service: 'keys' });
//       return null;
//     }

//     if (stations.length == 2) {
//       const { headers } = await axios.post(
//         'https://live.harvest.com/?sid=10243',
//         {
//           username: process.env.HARVEST_REALJOURNEYS_USERNAME,
//           password: process.env.HARVEST_REALJOURNEYS_PASSWORD,
//           submit: 'Login'
//         },
//         {
//           headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//           maxRedirects: 0,
//           validateStatus: (status) => {
//             return status == 302;
//           }
//         }
//       );

//       const cookies = headers['set-cookie'];
//       const regex = /PHPSESSID=[0-9a-zA-Z]+;\s/g;
//       if (cookies && cookies.length && cookies[0] && cookies[0].match(regex)) {
//         const cookie = cookies[0].slice(0, cookies[0].indexOf('; '));
//         if (cookie) {
//           for (const s of stations) {
//             s.harvestCookie = cookie;
//             await s.save();
//           }
//         }
//       }
//     }
//   } catch (error) {
//     logger.error('An error occurred while updating keys', { service: 'keys' });
//     logger.error(error, { service: 'keys' });
//     return null;
//   }
// }

export async function removeOldData() {
  try {
    const stations = await Station.find({});
    if (!stations.length) {
      logger.error('No stations found.', { service: 'cleanup' });
      return null;
    }

    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
    for (const s of stations) {
      await Station.updateOne({ _id: s._id }, { $pull: { data: { time: { $lte: cutoff } } } });
    }
  } catch (error) {
    logger.error('An error occurred while removing old data', { service: 'cleanup' });
    logger.error(error, { service: 'cleanup' });
    return null;
  }
}
