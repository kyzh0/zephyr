import pLimit from 'p-limit';

import { httpClient, logger, type StationAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';
import { isTimestampFresh } from '@/lib/utils';

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

            // skip stale data
            const unix = Number(d.time);
            if (d.invalid === '0' && isTimestampFresh(unix)) {
              const avg = Number(d.Uw);
              if (avg !== null && Number.isFinite(avg)) {
                windAverage = avg * 3.6;
              } // m/s -> km/h
              const dir = Number(d.Uwdir);
              if (dir !== null && Number.isFinite(dir)) {
                windBearing = dir;
              }
              const temp = Number(d.Tp);
              if (temp !== null && Number.isFinite(temp)) {
                temperature = temp;
              }
            } else {
              logger.warn(`auckland council stale data - ${station.externalId}`, {
                service: 'station',
                type: 'ac'
              });
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch {
          logger.warn(`auckland council error - ${station.externalId}`, {
            service: 'station',
            type: 'ac'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
