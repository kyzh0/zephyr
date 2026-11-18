import { httpClient, logger, type StationAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';
import { isTimestampFresh } from '@/lib/utils';

type Series = [number, number | null][]; // [unix ms, value]

type EnvirolapseResponse = {
  wind_speed_vector?: Series; // km/h
  wind_gust_5min?: Series; // km/h
  wind_direction_vector?: Series;
  air_temperature_avg?: Series;
};

const latest = (series?: Series): [number, number | null] | null =>
  series?.length ? series[series.length - 1] : null;

export default async function scrapeEnvirolapseData(
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

    const { data } = await httpClient.get<EnvirolapseResponse>(
      'https://envirolapse.mvpbee.com/api/weather'
    );

    const wind = latest(data?.wind_speed_vector);

    if (wind) {
      // skip stale data
      if (isTimestampFresh(wind[0])) {
        windAverage = wind[1];
        windGust = latest(data.wind_gust_5min)?.[1] ?? null;
        windBearing = latest(data.wind_direction_vector)?.[1] ?? null;
        temperature = latest(data.air_temperature_avg)?.[1] ?? null;
      } else {
        logger.warn('envirolapse stale data', {
          service: 'station',
          type: 'envirolapse'
        });
      }
    }

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch {
    logger.warn('envirolapse error', { service: 'station', type: 'envirolapse' });
    await processScrapedData(station, null, null, null, null, true);
  }
}
