import pLimit from 'p-limit';

import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/stations/processScrapedData';
import logger from '@/lib/logger';

import { type StationAttrs } from '@/models/stationModel';
import { type WithId } from '@/types/mongoose';

type WindGuruResponse = {
  wind_avg?: number; // kt
  wind_max?: number; // kt
  wind_direction?: number;
  temperature?: number;
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

          if (data) {
            if (data.wind_avg && Number.isFinite(data.wind_avg))
              windAverage = Math.round(data.wind_avg * 1.852 * 100) / 100;
            if (data.wind_max && Number.isFinite(data.wind_max))
              windGust = Math.round(data.wind_max * 1.852 * 100) / 100;
            if (data.wind_direction && Number.isFinite(data.wind_direction))
              windBearing = data.wind_direction;
            if (data.temperature && Number.isFinite(data.temperature))
              temperature = data.temperature;
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
