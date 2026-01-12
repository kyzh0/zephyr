import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/stations/processScrapedData';
import logger from '@/lib/logger';

import type { StationAttrs } from '@/models/stationModel';
import type { WithId } from '@/types/mongoose';

type MpycResponse = {
  current?: {
    windspeed?: string; // e.g. "12 knots"
    windGust?: string; // e.g. "18 knots"
    winddir_formatted?: string;
    outTemp_formatted?: string;
  };
};

function parseKnots(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value.replace(' knots', '').trim());
  return Number.isNaN(n) ? null : n;
}

export default async function scrapeMpycData(stations: WithId<StationAttrs>[]): Promise<void> {
  const station = stations[0];
  if (!station) return;

  try {
    let windAverage: number | null = null;
    let windGust: number | null = null;
    let windBearing: number | null = null;
    let temperature: number | null = null;

    const { data } = await httpClient.get<MpycResponse>(
      'https://mpyc.nz/weather/json/weewx_data.json'
    );

    if (data?.current) {
      const avgKt = parseKnots(data.current.windspeed);
      if (avgKt != null) windAverage = Math.round(avgKt * 1.852 * 100) / 100;

      const gustKt = parseKnots(data.current.windGust);
      if (gustKt != null) windGust = Math.round(gustKt * 1.852 * 100) / 100;

      const bearing = Number(data.current.winddir_formatted);
      if (data.current.winddir_formatted !== null && Number.isFinite(bearing))
        windBearing = bearing;

      const temp = Number(data.current.outTemp_formatted);
      if (data.current.outTemp_formatted !== null && Number.isFinite(temp)) temperature = temp;
    }

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch {
    logger.warn('mpyc error', { service: 'station', type: 'mpyc' });
    await processScrapedData(station, null, null, null, null, true);
  }
}
