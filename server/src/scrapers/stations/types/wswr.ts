import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/stations/processScrapedData';
import logger from '@/lib/logger';

import { type StationAttrs } from '@/models/stationModel';
import { type WithId } from '@/types/mongoose';

type WswrRow = {
  record_time: string; // e.g. "2026-01-12T01:23:45"
  windspd_10mnavg: number; // kt
  windgst_10mnmax: number; // kt
  winddir_10mnavg: number;
  airtemp_01mnavg: number;
};

type WswrResponse = WswrRow[];

export default async function scrapeWswrData(stations: WithId<StationAttrs>[]): Promise<void> {
  const station = stations[0];
  if (!station) return;

  try {
    let windAverage: number | null = null;
    let windGust: number | null = null;
    let windBearing: number | null = null;
    let temperature: number | null = null;

    const { data } = await httpClient.get<WswrResponse>(
      'https://api.wswr.jkent.tech/weatherdata/mostrecent/60'
    );

    if (data?.length) {
      const d = data[0];

      const time = new Date(`${d.record_time}.000Z`);
      const ts = time.getTime();

      if (!Number.isNaN(ts) && Date.now() - ts < 20 * 60 * 1000) {
        windAverage = Math.round(d.windspd_10mnavg * 1.852 * 10) / 10; // kt -> km/h
        windGust = Math.round(d.windgst_10mnmax * 1.852 * 10) / 10;
        windBearing = d.winddir_10mnavg;
        temperature = d.airtemp_01mnavg;
      }
    }

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch {
    logger.warn('wswr error', { service: 'station', type: 'wswr' });
    await processScrapedData(station, null, null, null, null, true);
  }
}
