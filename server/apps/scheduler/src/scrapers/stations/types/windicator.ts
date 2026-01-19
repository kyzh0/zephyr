import { fromZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';

import { httpClient, logger, type StationAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

export type PotSumLiveFetch = {
  Wind: string;
  Gust: string;
  Direction: string;
  MaxWaveHeight: string;
  SigWaveHeight: string;
  MeanPeriod: string;
  Tide: string;
  HarbourTide: string;
  Timestamp: string;
  TugBerthWind: string;
  TugBerthGust: string;
  TugBerthDirection: string;
  Berth8Wind: string;
  Berth8Gust: string;
  Berth8Direction: string;
  Velocity: string;
  PredictedVelocity: string;
  FlowDirection: string;
  AirTemp: string;
  WaterTemp: string;
};

export type PotsumLiveFetchResponse = {
  'potsum-live-fetch': PotSumLiveFetch;
};

function parseNumeric(value?: string): number | null {
  if (!value) {
    return null;
  }

  const cleaned = value.replace(/[^0-9.]/g, '');
  if (cleaned === '') {
    return null;
  }

  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export default async function scrapeWindicatorData(
  stations: WithId<StationAttrs>[]
): Promise<void> {
  const station = stations[0];
  if (!station) {
    return;
  }

  try {
    let windAverage: number | null = null;
    let windGust: number | null = null;
    let windBearing: number | null = null;
    let temperature: number | null = null;

    const { data } = await httpClient.get<PotsumLiveFetchResponse>(
      'https://windicator.app/potsum-latest.json'
    );

    if (data) {
      const fetch = data['potsum-live-fetch'];
      const time = fromZonedTime(
        parse(fetch.Timestamp, 'dd/MM/yyyy HH:mm', new Date()),
        'Pacific/Auckland'
      );

      // skip if older than 20 min
      if (Date.now() - time.getTime() < 20 * 60 * 1000) {
        const avg = parseNumeric(fetch.Wind);
        const gust = parseNumeric(fetch.Gust);
        windAverage = avg === null ? null : avg * 1.852; // kt -> km/h
        windGust = gust === null ? null : gust * 1.852;
        windBearing = parseNumeric(fetch.Direction); // "133° SE" → 133
        temperature = parseNumeric(fetch.AirTemp); // "19.1 °C" → 19.1
      }
    }

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch {
    logger.warn('windicator error', { service: 'station', type: 'windicator' });
    await processScrapedData(station, null, null, null, null, true);
  }
}
