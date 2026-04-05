import { httpClient, logger, type StationAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';
import { isTimestampFresh } from '@/lib/utils';

type TclzData = {
  timestamp: string;
  wind_speed: number;
  wind_gust: number;
  wind_direction: number;
  temperature: number;
  humidity: number;
  pressure: number;
  solar_voltage: number;
}[];

export default async function scrapeTclzData(stations: WithId<StationAttrs>[]): Promise<void> {
  const station = stations[0];
  if (!station) {
    return;
  }

  try {
    let windAverage: number | null = null;
    let windGust: number | null = null;
    let windBearing: number | null = null;
    let temperature: number | null = null;

    const { data } = await httpClient.get<TclzData>(
      `https://wzdkygbgawkfiqxhkxfs.supabase.co/rest/v1/wxtclz_data_latest?apikey=${process.env.TCLZ_KEY}`
    );

    // skip stale data
    if (data && data.length) {
      const d = data[0];
      const ts = new Date(d.timestamp);
      if (isTimestampFresh(ts)) {
        windAverage = d.wind_speed;
        windGust = d.wind_gust;
        windBearing = d.wind_direction;
        temperature = d.temperature;
      } else {
        logger.warn('tclz stale data', {
          service: 'station',
          type: 'tclz'
        });
      }
    }

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch {
    logger.warn('tclz error', { service: 'station', type: 'tclz' });
    await processScrapedData(station, null, null, null, null, true);
  }
}
