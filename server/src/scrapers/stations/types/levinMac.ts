import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/stations/processScrapedData';
import logger from '@/lib/logger';

import type { StationDoc } from '@/models/stationModel';

type LevinMacResponse = {
  data?: {
    wind?: {
      data?: {
        windspeedmph?: { value: string | number };
        windgustmph?: { value: string | number };
        winddir?: { value: string | number };
      };
    };
    temp?: {
      data?: {
        tempf?: { value: string | number };
      };
    };
  };
};

export default async function scrapeLevinMacData(stations: StationDoc[]): Promise<void> {
  const station = stations[0];
  if (!station) return;

  try {
    let windAverage: number | null = null;
    let windGust: number | null = null;
    let windBearing: number | null = null;
    let temperature: number | null = null;

    const { data } = await httpClient.post<LevinMacResponse>(
      'https://www.ecowitt.net/index/home',
      {
        device_id: 'MzdqYkJqWlBsbWYzREMzdkJpREs1dz09',
        authorize: '22NU86'
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const d = data?.data;
    if (d?.wind?.data && d?.temp?.data) {
      windAverage = Number(d.wind.data.windspeedmph?.value); // actually kmh
      windGust = Number(d.wind.data.windgustmph?.value);
      windBearing = Number(d.wind.data.winddir?.value);
      temperature = Number(d.temp.data.tempf?.value); // actually celsius
    }

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch {
    logger.warn('levin error', { service: 'station', type: 'levin' });
    await processScrapedData(station, null, null, null, null, true);
  }
}
