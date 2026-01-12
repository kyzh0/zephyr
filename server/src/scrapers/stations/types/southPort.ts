import { fromZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';

import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/stations/processScrapedData';
import logger from '@/lib/logger';

import { type StationAttrs } from '@/models/stationModel';
import { type WithId } from '@/types/mongoose';

type SouthPortResponse = {
  lastReading: string; // "yyyy-MM-dd HH:mm:ss"
  AveSpeed: number; // kt
  GustSpeed: number; // kt
  AveDirection: string | number;
};

export default async function scrapeSouthPortData(stations: WithId<StationAttrs>[]): Promise<void> {
  const station = stations[0];
  if (!station) return;

  try {
    let windAverage: number | null = null;
    let windGust: number | null = null;
    let windBearing: number | null = null;
    const temperature: number | null = null;

    const { data } = await httpClient.get<SouthPortResponse>(
      'https://southportvendor.marketsouth.co.nz/testAPI/getBaconWindData.php?_=1760437457410'
    );

    if (data?.lastReading) {
      const time = fromZonedTime(
        parse(data.lastReading, 'yyyy-MM-dd HH:mm:ss', new Date()),
        'Pacific/Auckland'
      );

      if (Date.now() - time.getTime() < 20 * 60 * 1000) {
        windAverage = Math.round(data.AveSpeed * 1.852 * 10) / 10; // kt -> km/h
        windGust = Math.round(data.GustSpeed * 1.852 * 10) / 10;
        windBearing = Number(data.AveDirection);
        if (Number.isNaN(windBearing)) windBearing = null;
      }
    }

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch {
    logger.warn('southport error', { service: 'station', type: 'sp' });
    await processScrapedData(station, null, null, null, null, true);
  }
}
