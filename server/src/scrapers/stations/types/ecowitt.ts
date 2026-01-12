import pLimit from 'p-limit';

import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/stations/processScrapedData';
import logger from '@/lib/logger';

import type { StationAttrs } from '@/models/stationModel';
import type { WithId } from '@/types/mongoose';

type EcowittMetric = {
  time: string | number;
  value: string | number;
};

type EcowittResponse = {
  data?: {
    wind?: {
      wind_speed?: EcowittMetric;
      wind_gust?: EcowittMetric;
      wind_direction?: EcowittMetric;
    };
    outdoor?: {
      temperature?: EcowittMetric;
    };
  };
};

export default async function scrapeEcowittData(stations: WithId<StationAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage: number | null = null;
          let windGust: number | null = null;
          let windBearing: number | null = null;
          let temperature: number | null = null;

          const { ECOWITT_API_KEY, ECOWITT_APPLICATION_KEY } = process.env;

          const { data } = await httpClient.get<EcowittResponse>(
            `https://api.ecowitt.net/api/v3/device/real_time?api_key=${ECOWITT_API_KEY}&application_key=${ECOWITT_APPLICATION_KEY}&mac=${station.externalId}&wind_speed_unitid=7&temp_unitid=1`
          );

          const timeNow = Math.round(Date.now() / 1000); // epoch time in s

          const d = data?.data;
          if (d) {
            const w = d.wind;
            if (w?.wind_speed && timeNow - Number(w.wind_speed.time) < 20 * 60) {
              windAverage = Number(w.wind_speed.value);
            }
            if (w?.wind_gust && timeNow - Number(w.wind_gust.time) < 20 * 60) {
              windGust = Number(w.wind_gust.value);
            }
            if (w?.wind_direction && timeNow - Number(w.wind_direction.time) < 20 * 60) {
              windBearing = Number(w.wind_direction.value);
            }

            const temp = d.outdoor?.temperature;
            if (temp && timeNow - Number(temp.time) < 20 * 60) {
              temperature = Number(temp.value);
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch {
          logger.warn(`ecowitt error - ${station.externalId}`, {
            service: 'station',
            type: 'ecowitt'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
