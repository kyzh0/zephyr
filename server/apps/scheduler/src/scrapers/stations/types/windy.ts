import pLimit from 'p-limit';

import { httpClient, logger, type StationAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

type WindyResponse = {
  time: string; // ISO timestamp
  wind: number; // m/s
  gust: number; // m/s
  dir: number;
};

export default async function scrapeWindyData(stations: WithId<StationAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage: number | null = null;
          let windGust: number | null = null;
          let windBearing: number | null = null;
          const temperature: number | null = null;

          const { data } = await httpClient.get<WindyResponse>(
            `https://node.windy.com/pois/v2/wind/${station.externalId}`
          );

          // skip if data is older than 20 mins
          const ts = new Date(data.time).getTime();
          if (!Number.isNaN(ts) && Date.now() - ts < 20 * 60 * 1000) {
            windAverage = Math.round(data.wind * 3.6 * 100) / 100; // m/s -> km/h
            windGust = Math.round(data.gust * 3.6 * 100) / 100;
            windBearing = data.dir;
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch {
          logger.warn(`windy error - ${station.externalId}`, {
            service: 'station',
            type: 'windy'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
