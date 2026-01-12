import pLimit from 'p-limit';

import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/stations/processScrapedData';
import logger from '@/lib/logger';

import { type StationAttrs } from '@/models/stationModel';
import { type WithId } from '@/types/mongoose';

type HarvestSite = { site_id: string };
type HarvestSiteListResponse = {
  sites?: HarvestSite[];
  _links?: { next?: unknown };
};

type HarvestTraceRow = {
  unix_time: string;
  data_value: number | null;
};

type HarvestGetDataResponse = {
  data?: HarvestTraceRow[];
};

type HarvestGraphPoint = { data_value: number | null };
type HarvestGraphSeries = { data?: HarvestGraphPoint[] };
type HarvestGraphResponse =
  | Array<{ data?: HarvestGraphPoint[] }>
  | Record<string, HarvestGraphSeries | undefined>;

export default async function scrapeHarvestData(stations: WithId<StationAttrs>[]): Promise<void> {
  try {
    // use API for FENZ stations
    const fenzIds: string[] = [];

    const apiKey = process.env.HARVEST_FENZ_KEY;

    let { data } = await httpClient.get<HarvestSiteListResponse>(
      `https://live.harvest.com/api.php?output_type=application/json&command_type=get_user_site_list&api_key=${apiKey}`
    );

    if (data?.sites?.length) {
      for (const s of data.sites) fenzIds.push(s.site_id);
    }

    // get next 200
    if (data?._links?.next) {
      ({ data } = await httpClient.get<HarvestSiteListResponse>(
        `https://live.harvest.com/api.php?output_type=application/json&command_type=get_user_site_list&api_key=${apiKey}&start=200`
      ));

      if (data?.sites?.length) {
        for (const s of data.sites) fenzIds.push(s.site_id);
      }
    }

    const fenzStations: WithId<StationAttrs>[] = [];
    const otherStations: WithId<StationAttrs>[] = [];

    for (const station of stations) {
      const sid = (station.externalId ?? '').split('_')[0];
      if (fenzIds.includes(sid)) fenzStations.push(station);
      else otherStations.push(station);
    }

    // fenz
    if (fenzStations.length) {
      const limit = pLimit(5);
      await Promise.allSettled(
        fenzStations.map((station) => limit(() => scrapeFenzHarvestStation(station)))
      );
    }

    // others
    if (otherStations.length) {
      const limit = pLimit(5);
      await Promise.allSettled(
        otherStations.map((station) => limit(() => scrapeHarvestStation(station)))
      );
    }
  } catch (error) {
    logger.warn('harvest FENZ API error', { service: 'station', type: 'harvest' });

    const msg = error instanceof Error ? error.message : String(error);
    logger.warn(msg, { service: 'station', type: 'harvest' });

    // try individually, ignore fenz API
    const limit = pLimit(5);
    await Promise.allSettled(stations.map((station) => limit(() => scrapeHarvestStation(station))));
  }
}

async function scrapeFenzHarvestStation(station: WithId<StationAttrs>): Promise<void> {
  try {
    let windAverage: number | null = null;
    let windGust: number | null = null;
    let windBearing: number | null = null;
    let temperature: number | null = null;

    const apiKey = process.env.HARVEST_FENZ_KEY;

    const windAvgTraceId = station.harvestWindAverageId!.split('_')[1];
    const windGustTraceId = station.harvestWindGustId!.split('_')[1];
    const windDirTraceId = station.harvestWindDirectionId!.split('_')[1];
    const tempTraceId = station.harvestTemperatureId!.split('_')[1];

    // wind avg
    let { data } = await httpClient.get<HarvestGetDataResponse>(
      `https://live.harvest.com/api.php?output_type=application/json&command_type=get_data&api_key=${apiKey}&trace_id=${windAvgTraceId}`
    );
    windAverage = extractFreshHarvestValue(data);

    // wind gust
    ({ data } = await httpClient.get<HarvestGetDataResponse>(
      `https://live.harvest.com/api.php?output_type=application/json&command_type=get_data&api_key=${apiKey}&trace_id=${windGustTraceId}`
    ));
    windGust = extractFreshHarvestValue(data);

    // wind direction
    ({ data } = await httpClient.get<HarvestGetDataResponse>(
      `https://live.harvest.com/api.php?output_type=application/json&command_type=get_data&api_key=${apiKey}&trace_id=${windDirTraceId}`
    ));
    windBearing = extractFreshHarvestValue(data);

    // temperature
    ({ data } = await httpClient.get<HarvestGetDataResponse>(
      `https://live.harvest.com/api.php?output_type=application/json&command_type=get_data&api_key=${apiKey}&trace_id=${tempTraceId}`
    ));
    temperature = extractFreshHarvestValue(data);

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch {
    logger.warn(`harvest FENZ error - ${station.externalId}`, {
      service: 'station',
      type: 'harvest'
    });
    await processScrapedData(station, null, null, null, null, true);
  }
}

function extractFreshHarvestValue(resp: HarvestGetDataResponse): number | null {
  const row = resp?.data?.length === 1 ? resp.data[0] : null;
  if (!row) return null;

  const unix = Number(row.unix_time.replace('.000', ''));
  const ts = new Date(unix * 1000);

  // skip data older than 40 mins
  if (Number.isNaN(ts.getTime()) || Date.now() - ts.getTime() >= 40 * 60 * 1000) return null;

  return row.data_value ?? null;
}

async function processHarvestValue(
  sid: string,
  configId: string,
  graphId: string,
  traceId: string,
  cookie?: string
): Promise<number | null> {
  let date = new Date();
  let utcYear = date.getUTCFullYear();
  let utcMonth = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  let utcDay = date.getUTCDate().toString().padStart(2, '0');
  let utcHours = date.getUTCHours().toString().padStart(2, '0');
  let utcMins = date.getUTCMinutes().toString().padStart(2, '0');
  const dateTo = `${utcYear}-${utcMonth}-${utcDay}T${utcHours}:${utcMins}:00.000`;

  date = new Date(date.getTime() - 40 * 60 * 1000); // last 40 min
  utcYear = date.getUTCFullYear();
  utcMonth = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  utcDay = date.getUTCDate().toString().padStart(2, '0');
  utcHours = date.getUTCHours().toString().padStart(2, '0');
  utcMins = date.getUTCMinutes().toString().padStart(2, '0');
  const dateFrom = `${utcYear}-${utcMonth}-${utcDay}T${utcHours}:${utcMins}:00.000`;

  try {
    const cfg: { headers: Record<string, string> } = {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    };
    if (cookie) cfg.headers.Cookie = cookie;

    const { data } = await httpClient.post<HarvestGraphResponse>(
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

    const points = extractHarvestGraphPoints(data);
    if (points?.length) return points[points.length - 1].data_value ?? null;
  } catch {
    logger.warn(`harvest error data value - ${sid} / ${graphId} / ${traceId}`, {
      service: 'station',
      type: 'harvest'
    });
  }

  return null;
}

function extractHarvestGraphPoints(data: HarvestGraphResponse): HarvestGraphPoint[] | null {
  if (Array.isArray(data)) {
    const d = data[0]?.data;
    return d?.length ? d : null;
  }

  const d = data['1']?.data ?? data['2']?.data ?? data['3']?.data;
  return d?.length ? d : null;
}

async function scrapeHarvestStation(station: WithId<StationAttrs>): Promise<void> {
  let ids = (station.externalId ?? '').split('_');
  if (ids.length !== 2) {
    logger.error(
      `Harvest station has invalid id / config id - ${station.name} / ${station.externalId}`,
      { service: 'station', type: 'harvest' }
    );
    return;
  }

  const sid = ids[0];
  const configId = ids[1];

  let windAverage: number | null = null;
  let windGust: number | null = null;
  let windBearing: number | null = null;
  let temperature: number | null = null;

  // wind avg
  ids = station.harvestWindAverageId?.split('_') ?? [];
  if (ids.length === 2) {
    windAverage = await processHarvestValue(sid, configId, ids[0], ids[1], station.harvestCookie);
  }

  // wind gust
  ids = station.harvestWindGustId?.split('_') ?? [];
  if (ids.length === 2) {
    windGust = await processHarvestValue(sid, configId, ids[0], ids[1], station.harvestCookie);
  }

  // wind direction
  ids = station.harvestWindDirectionId?.split('_') ?? [];
  if (ids.length === 2) {
    windBearing = await processHarvestValue(sid, configId, ids[0], ids[1], station.harvestCookie);
  }

  // temperature
  ids = station.harvestTemperatureId?.split('_') ?? [];
  if (ids.length === 2) {
    temperature = await processHarvestValue(sid, configId, ids[0], ids[1], station.harvestCookie);
  }

  await processScrapedData(station, windAverage, windGust, windBearing, temperature);
}
