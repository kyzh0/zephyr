import pLimit from 'p-limit';

import { httpClient, logger, type StationAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

type WUObservationMetric = {
  windSpeed?: number | null;
  windGust?: number | null;
  temp?: number | null;
};

type WUObservation = {
  winddir?: number | null;
  metric?: WUObservationMetric | null;
};

type WUResponse = {
  observations?: WUObservation[];
};

export default async function scrapeWeatherUndergroundData(
  stations: WithId<StationAttrs>[]
): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage: number | null = null;
          let windGust: number | null = null;
          let windBearing: number | null = null;
          let temperature: number | null = null;

          const { data } = await httpClient.get<WUResponse>(
            `https://api.weather.com/v2/pws/observations/current?apiKey=${process.env.WUNDERGROUND_KEY}&stationId=${station.externalId}&numericPrecision=decimal&format=json&units=m`
          );

          const obs = data.observations?.[0];
          if (obs) {
            windBearing = obs.winddir ?? null;
            const m = obs.metric;
            if (m) {
              windAverage = m.windSpeed ?? null;
              windGust = m.windGust ?? null;
              temperature = m.temp ?? null;
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch {
          logger.warn(`wu error - ${station.externalId}`, {
            service: 'station',
            type: 'wu'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
