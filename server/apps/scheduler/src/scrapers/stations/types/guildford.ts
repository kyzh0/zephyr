import pLimit from 'p-limit';

import { httpClient, logger, type StationAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';
import { isTimestampFresh } from '@/lib/utils';

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

export default async function scrapeGuildfordData(stations: WithId<StationAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage: number | null = null;
          let windGust: number | null = null;
          let windBearing: number | null = null;
          let temperature: number | null = null;

          const { GUILDFORD_ECOWITT_API_KEY, GUILDFORD_ECOWITT_APPLICATION_KEY } = process.env;

          const { data } = await httpClient.get<EcowittResponse>(
            `https://api.ecowitt.net/api/v3/device/real_time?api_key=${GUILDFORD_ECOWITT_API_KEY}&application_key=${GUILDFORD_ECOWITT_APPLICATION_KEY}&mac=${station.externalId}&wind_speed_unitid=7&temp_unitid=1`
          );

          const d = data?.data;
          if (d) {
            const w = d.wind;
            if (w?.wind_speed && isTimestampFresh(Number(w.wind_speed.time))) {
              windAverage = Number(w.wind_speed.value);
            }
            if (w?.wind_gust && isTimestampFresh(Number(w.wind_gust.time))) {
              windGust = Number(w.wind_gust.value);
            }
            if (w?.wind_direction && isTimestampFresh(Number(w.wind_direction.time))) {
              windBearing = Number(w.wind_direction.value);
            }

            const temp = d.outdoor?.temperature;
            if (temp && isTimestampFresh(Number(temp.time))) {
              temperature = Number(temp.value);
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch {
          logger.warn(`guildford error - ${station.externalId}`, {
            service: 'station',
            type: 'guildford'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
