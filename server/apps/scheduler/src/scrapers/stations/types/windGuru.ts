import pLimit from 'p-limit';
import { fromZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';

import { httpClient, logger, type StationAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

type WindGuruResponse = {
  wind_avg?: number; // kt
  wind_max?: number; // kt
  wind_direction?: number;
  temperature?: number;
  datetime?: string; // e.g. 2026-02-15 18:27:11 NZDT
};

export default async function scrapeWindGuruData(stations: WithId<StationAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage: number | null = null;
          let windGust: number | null = null;
          let windBearing: number | null = null;
          let temperature: number | null = null;

          const { data } = await httpClient.get<WindGuruResponse>(
            `https://www.windguru.cz/int/iapi.php?q=station_data_current&id_station=${station.externalId}`,
            {
              headers: {
                Referer: `https://www.windguru.cz/station/${station.externalId}`
              }
            }
          );

          if (data && data.datetime) {
            const time = fromZonedTime(
              parse(data.datetime.replace(/ NZD[ST]$/, ''), 'yyyy-MM-dd HH:mm:ss', new Date()),
              'Pacific/Auckland'
            );

            if (time && Date.now() - time.getTime() < 20 * 60 * 1000) {
              const avg = Number(data.wind_avg);
              if (data.wind_avg !== null && Number.isFinite(avg)) {
                windAverage = Math.round(avg * 1.852 * 100) / 100;
              }

              const gust = Number(data.wind_max);
              if (data.wind_max !== null && Number.isFinite(gust)) {
                windGust = Math.round(gust * 1.852 * 100) / 100;
              }

              const dir = Number(data.wind_direction);
              if (data.wind_direction !== null && Number.isFinite(dir)) {
                windBearing = dir;
              }

              const temp = Number(data.temperature);
              if (data.temperature !== null && Number.isFinite(temp)) {
                temperature = temp;
              }
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch {
          logger.warn(`windguru error - ${station.externalId}`, {
            service: 'station',
            type: 'windguru'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
