import pLimit from 'p-limit';

import { httpClient, logger, type StationAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

type PredictWindSample = {
  id: string | number;
  tws?: number; // true wind speed kt
  gust?: number;
  twd?: number; // true wind direction
};

type PredictWindResponse = {
  samples: PredictWindSample[];
};

export default async function scrapePredictWindData(
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
          const temperature: number | null = null;

          const { data } = await httpClient.get<PredictWindResponse>(
            `https://forecast.predictwind.com/observations/jardines.json?api_key=${process.env.PREDICTWIND_KEY}`
          );

          const match = data?.samples?.find((s) => s.id.toString() === station.externalId);

          if (match) {
            const avg = Number(match.tws);
            if (match.tws !== null && Number.isFinite(avg)) {
              windAverage = Math.round(avg * 1.852 * 100) / 100;
            }

            const gust = Number(match.gust);
            if (match.gust !== null && Number.isFinite(gust)) {
              windGust = Math.round(gust * 1.852 * 100) / 100;
            }

            const dir = Number(match.twd);
            if (match.twd !== null && Number.isFinite(dir)) {
              windBearing = dir;
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch {
          logger.warn(`predictwind error - ${station.externalId}`, {
            service: 'station',
            type: 'pw'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
