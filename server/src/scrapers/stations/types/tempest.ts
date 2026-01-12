import pLimit from 'p-limit';

import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/stations/processScrapedData';
import logger from '@/lib/logger';

import { type StationAttrs } from '@/models/stationModel';
import { type WithId } from '@/types/mongoose';

type TempestResponse = {
  current_conditions?: {
    wind_avg?: number | null;
    wind_gust?: number | null;
    wind_direction?: number | null;
    air_temperature?: number | null;
  };
};

export default async function scrapeTempestData(stations: WithId<StationAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage: number | null = null;
          let windGust: number | null = null;
          let windBearing: number | null = null;
          let temperature: number | null = null;

          const { data } = await httpClient.get<TempestResponse>(
            `https://swd.weatherflow.com/swd/rest/better_forecast?api_key=${process.env.TEMPEST_KEY}&station_id=${station.externalId}&units_temp=c&units_wind=kph`
          );

          const cc = data.current_conditions;
          if (cc) {
            windAverage = cc.wind_avg ?? null;
            windGust = cc.wind_gust ?? null;
            windBearing = cc.wind_direction ?? null;
            temperature = cc.air_temperature ?? null;
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch {
          logger.warn(`tempest error - ${station.externalId}`, {
            service: 'station',
            type: 'tempest'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
