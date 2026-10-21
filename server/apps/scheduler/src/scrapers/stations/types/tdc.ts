import pLimit from 'p-limit';
import { fromZonedTime } from 'date-fns-tz';

import { httpClient, logger, type StationAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';
import { isTimestampFresh } from '@/lib/utils';

type HilltopReading = { time: Date; value: number };

function extractLatestReading(xml: string): HilltopReading | null {
  const matches = [...xml.matchAll(/<E><T>([^<]+)<\/T><I1>([^<]+)<\/I1><\/E>/g)];
  const last = matches[matches.length - 1];
  if (!last) {
    return null;
  }

  const value = Number(last[2]);
  const time = fromZonedTime(last[1], 'Pacific/Auckland');
  if (!Number.isFinite(value) || isNaN(time.getTime())) {
    return null;
  }

  return { time, value };
}

async function fetchMeasurement(site: string, measurement: string): Promise<HilltopReading | null> {
  const { data } = await httpClient.get<string>(
    'https://envdata.tasman.govt.nz/hydro-working.hts?Service=Hilltop&Request=GetData' +
      `&Site=${encodeURIComponent(site)}` +
      `&Measurement=${encodeURIComponent(measurement)}`
  );
  return data?.length ? extractLatestReading(data) : null;
}

export default async function scrapeTdcData(stations: WithId<StationAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          const site = station.externalId ?? '';

          const [speed, direction] = await Promise.all([
            fetchMeasurement(site, 'Wind Speed (10 min)'),
            fetchMeasurement(site, 'Wind Direction (10 min)')
          ]);

          if (!speed || !isTimestampFresh(speed.time)) {
            logger.warn(`tdc error - stale or missing data for ${station.externalId}`, {
              service: 'station',
              type: 'tdc'
            });

            await processScrapedData(station, null, null, null, null, true);
            return;
          }

          const bearing = direction && isTimestampFresh(direction.time) ? direction.value : null;

          await processScrapedData(station, speed.value, null, bearing, null);
        } catch {
          logger.warn(`tdc error - ${station.externalId}`, {
            service: 'station',
            type: 'tdc'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
