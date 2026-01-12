import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/stations/processScrapedData';
import logger from '@/lib/logger';

import type { StationDoc } from '@/models/stationModel';

type MfhbResponse = {
  wind?: number | null;
  windDirection?: number | null;
  temperature?: number | null;
};

export default async function scrapeMfhbData(stations: StationDoc[]): Promise<void> {
  const station = stations[0];
  if (!station) return;

  try {
    let windAverage: number | null = null;
    const windGust: number | null = null;
    let windBearing: number | null = null;
    let temperature: number | null = null;

    const { data } = await httpClient.get<MfhbResponse>(
      'https://www.weatherlink.com/embeddablePage/getData/5e1372c8fe104ac5acc1fe2d8cb8b85c'
    );

    if (data) {
      windAverage = data.wind ?? null;
      windBearing = data.windDirection ?? null;
      temperature = data.temperature ?? null;
    }

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch {
    logger.warn('mfhb error', { service: 'station', type: 'mfhb' });
    await processScrapedData(station, null, null, null, null, true);
  }
}
