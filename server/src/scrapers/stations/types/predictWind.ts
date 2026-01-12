import pLimit from 'p-limit';

import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/stations/processScrapedData';
import logger from '@/lib/logger';

import type { StationAttrs } from '@/models/stationModel';
import type { WithId } from '@/types/mongoose';

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
            if (match.tws && Number.isFinite(match.tws))
              windAverage = Math.round(match.tws * 1.852 * 100) / 100;
            if (match.gust && Number.isFinite(match.gust))
              windGust = Math.round(match.gust * 1.852 * 100) / 100;
            if (match.twd && Number.isFinite(match.twd)) windBearing = match.twd;
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
