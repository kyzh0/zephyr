import pLimit from 'p-limit';

import {
  httpClient,
  logger,
  getWindBearingFromDirection,
  type StationAttrs,
  type WithId
} from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

type MetserviceWindObs = {
  averageSpeed?: number | null;
  gustSpeed?: number | null;
  strength?: string | null;
  direction?: string | null;
};

type MetserviceTempObs = {
  current?: number | null;
};

type MetserviceResponse = {
  observations?: {
    wind?: MetserviceWindObs[];
    temperature?: MetserviceTempObs[];
  };
};

export default async function scrapeMetserviceData(
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

          const { data } = await httpClient.get<MetserviceResponse>(
            `https://www.metservice.com/publicData/webdata/module/weatherStationCurrentConditions/${station.externalId}`
          );

          const wind = data.observations?.wind?.[0];
          if (wind) {
            windAverage = wind.averageSpeed ?? null;
            windGust = wind.gustSpeed ?? null;

            if (wind.strength === 'Calm') {
              if (windAverage == null) {
                windAverage = 0;
              }
              if (windGust == null) {
                windGust = 0;
              }
            }

            windBearing = wind.direction ? getWindBearingFromDirection(wind.direction) : null;
          }

          const temp = data.observations?.temperature?.[0];
          if (temp) {
            temperature = temp.current ?? null;
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch {
          logger.warn(`metservice error - ${station.externalId}`, {
            service: 'station',
            type: 'metservice'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
