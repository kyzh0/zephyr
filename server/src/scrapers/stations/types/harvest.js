import pLimit from 'p-limit';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeHarvestData(stations) {
  try {
    // use API for FENZ stations
    const fenzIds = [];
    let { data } = await httpClient.get(
      `https://live.harvest.com/api.php?output_type=application/json&command_type=get_user_site_list&api_key=${process.env.HARVEST_FENZ_KEY}`
    );

    if (data) {
      if (data.sites && data.sites.length) {
        for (const s of data.sites) {
          fenzIds.push(s.site_id);
        }
      }

      // get next 200
      if (data['_links'] && data['_links'].next) {
        ({ data } = await httpClient.get(
          `https://live.harvest.com/api.php?output_type=application/json&command_type=get_user_site_list&api_key=${process.env.HARVEST_FENZ_KEY}&start=200`
        ));

        if (data && data.sites && data.sites.length) {
          for (const s of data.sites) {
            fenzIds.push(s.site_id);
          }
        }
      }
    }

    const fenzStations = [];
    const otherStations = [];
    for (const station of stations) {
      const sid = station.externalId.split('_')[0];
      if (fenzIds.includes(sid)) {
        fenzStations.push(station);
      } else {
        otherStations.push(station);
      }
    }

    // fenz
    if (fenzStations.length) {
      const limit = pLimit(10);
      await Promise.allSettled(
        fenzStations.map((station) => limit(scrapeFenzHarvestStation(station)))
      );
    }

    // others
    if (otherStations.length) {
      const limit = pLimit(10);
      await Promise.allSettled(
        otherStations.map((station) => limit(scrapeHarvestStation(station)))
      );
    }
  } catch (error) {
    logger.warn('harvest FENZ API error', {
      service: 'station',
      type: 'harvest'
    });
    logger.warn(error);

    // try individually, ignore fenz API
    const limit = pLimit(10);
    await Promise.allSettled(stations.map((station) => limit(scrapeHarvestStation(station))));
  }
}

async function scrapeFenzHarvestStation(station) {
  try {
    let windAverage = null;
    let windGust = null;
    let windBearing = null;
    let temperature = null;

    const windAvgTraceId = station.harvestWindAverageId.split('_')[1];
    const windGustTraceId = station.harvestWindGustId.split('_')[1];
    const windDirTraceId = station.harvestWindDirectionId.split('_')[1];
    const tempTraceId = station.harvestTemperatureId.split('_')[1];

    // wind avg
    let { data } = await httpClient.get(
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
    ({ data } = await httpClient.get(
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
    ({ data } = await httpClient.get(
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
    ({ data } = await httpClient.get(
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

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch (error) {
    logger.warn(`harvest FENZ error - ${station.externalId}`, {
      service: 'station',
      type: 'harvest'
    });

    await processScrapedData(station, null, null, null, null, true);
  }
}

async function processHarvestValue(sid, configId, graphId, traceId, cookie) {
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
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };
    if (cookie) cfg.headers.Cookie = cookie;
    const { data } = await httpClient.post(
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
    logger.warn(`harvest error data value - ${sid} / ${graphId} / ${traceId}`, {
      service: 'station',
      type: 'harvest'
    });
  }

  return null;
}

async function scrapeHarvestStation(station) {
  let ids = station.externalId.split('_');
  if (ids.length != 2) {
    logger.error(
      `Harvest station has invalid id / config id - ${station.name} / ${station.externalId}`,
      {
        service: 'station',
        type: 'harvest'
      }
    );
    return;
  }
  const sid = ids[0];
  const configId = ids[1];

  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  // wind avg
  ids = station.harvestWindAverageId.split('_');
  if (ids.length == 2) {
    windAverage = await processHarvestValue(sid, configId, ids[0], ids[1], station.harvestCookie);
  }

  // wind gust
  ids = station.harvestWindGustId.split('_');
  if (ids.length == 2) {
    windGust = await processHarvestValue(sid, configId, ids[0], ids[1], station.harvestCookie);
  }

  // wind direction
  ids = station.harvestWindDirectionId.split('_');
  if (ids.length == 2) {
    windBearing = await processHarvestValue(sid, configId, ids[0], ids[1], station.harvestCookie);
  }

  // temperature
  ids = station.harvestTemperatureId.split('_');
  if (ids.length == 2) {
    temperature = await processHarvestValue(sid, configId, ids[0], ids[1], station.harvestCookie);
  }

  await processScrapedData(station, windAverage, windGust, windBearing, temperature);
}
