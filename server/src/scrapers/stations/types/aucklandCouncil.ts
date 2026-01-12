import pLimit from 'p-limit';

import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/stations/processScrapedData';
import logger from '@/lib/logger';

import { type StationAttrs } from '@/models/stationModel';
import { type WithId } from '@/types/mongoose';

type AucklandCouncilRow = {
  time: string; // unix seconds as string
  invalid: string; // "0" / "1"
  Tp?: number | null;
  Uw?: number | null;
  Uwdir?: number | null;
};

type AucklandCouncilResponse = {
  data: AucklandCouncilRow[];
};

export default async function scrapeAucklandCouncilData(
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

          const { data } = await httpClient.get<AucklandCouncilResponse>(
            `https://coastalmonitoringac.netlify.app/.netlify/functions/obscapeProxy?station=${station.externalId}&parameters=Tp,Uw,Uwdir,invalid&latest=1`
          );

          if (data?.data?.length === 1) {
            const d = data.data[0];

            // ignore data older than 40 mins
            const unix = Number(d.time);
            const isFresh = Number.isFinite(unix) && Date.now() - unix * 1000 < 40 * 60 * 1000;

            if (d.invalid === '0' && isFresh) {
              if (typeof d.Uw === 'number') windAverage = d.Uw * 3.6; // m/s -> km/h
              if (typeof d.Uwdir === 'number') windBearing = d.Uwdir;
              if (typeof d.Tp === 'number') temperature = d.Tp;
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch {
          logger.warn(`ac error - ${station.externalId}`, {
            service: 'station',
            type: 'ac'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
