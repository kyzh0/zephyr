import pLimit from 'p-limit';

import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/stations/processScrapedData';
import logger from '@/lib/logger';

import type { StationAttrs } from '@/models/stationModel';
import type { WithId } from '@/types/mongoose';

type SofarOceanWind = {
  speed: number; // m/s
  direction: number;
};

type SofarOceanCurrentCondition = {
  timeLastUpdatedUTC: string;
  temperature?: number | null;
  wind?: SofarOceanWind | null;
};

type SofarOceanResponse = {
  data?: {
    currentConditions?: SofarOceanCurrentCondition[];
  };
};

export default async function scrapeSofarOceanData(
  stations: WithId<StationAttrs>[]
): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage: number | null = null;
          const windGust: number | null = null;
          let windBearing: number | null = null;
          let temperature: number | null = null;

          const { data } = await httpClient.post<SofarOceanResponse>(
            'https://api.sofarocean.com/fetch/devices/',
            { devices: [{ spotterId: station.externalId }] },
            { headers: { view_token: process.env.SOFAROCEAN_KEY ?? '' } }
          );

          const current = data?.data?.currentConditions;
          if (current?.length === 1) {
            const cc = current[0];
            const lastUpdate = new Date(cc.timeLastUpdatedUTC).getTime();

            // only update if data is less than 40 min old
            if (!Number.isNaN(lastUpdate) && Date.now() - lastUpdate < 40 * 60 * 1000) {
              temperature = cc.temperature ?? null;

              const wind = cc.wind;
              if (wind) {
                windAverage = wind.speed * 3.6; // m/s -> km/h
                windBearing = wind.direction;
              }
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch {
          logger.warn(`sofarocean error - ${station.externalId}`, {
            service: 'station',
            type: 'sfo'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
