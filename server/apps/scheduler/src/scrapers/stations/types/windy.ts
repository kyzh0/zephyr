import pLimit from 'p-limit';

import { httpClient, logger, type StationAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

type WindyResponse = {
  data: WindyData;
};

type WindyData = {
  ts: number[];
  temp: number[];
  wind: number[];
  windDir: number[];
  gust: number[];
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
          let temperature: number | null = null;

          const { data } = await httpClient.get<WindyResponse>(
            `https://node.windy.com/obs/measurement/v3/pws/${station.externalId}/10/1`
          );

          if (
            data &&
            data.data.ts.length &&
            data.data.ts.length == data.data.wind.length &&
            data.data.ts.length == data.data.windDir.length &&
            data.data.ts.length == data.data.gust.length &&
            data.data.ts.length == data.data.temp.length
          ) {
            const i = data.data.ts.length - 1;
            const ts = new Date(data.data.ts[i]).getTime();
            // skip if data is older than 20 mins
            if (!Number.isNaN(ts) && Date.now() - ts < 20 * 60 * 1000) {
              windAverage = Math.round(data.data.wind[i] * 3.6 * 100) / 100; // m/s -> km/h
              windGust = Math.round(data.data.gust[i] * 3.6 * 100) / 100;
              windBearing = data.data.windDir[i];
              temperature = Math.round(data.data.temp[i] - 273.15); // K -> °C
            }
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
