import { fromZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';
import pLimit from 'p-limit';

import { httpClient, logger, type StationAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';
import { isTimestampFresh } from '@/lib/utils';

export default async function scrapeMrcData(stations: WithId<StationAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage: number | null = null;
          let windGust: number | null = null;
          let windBearing: number | null = null;
          let temperature: number | null = null;

          const { data } = await httpClient.post<string>(
            `https://www.otago.ac.nz/surveying/potree/remote/${station.externalId}.csv`,
            undefined,
            { responseType: 'text' }
          );

          const matches = data.match(/"[0-9]{4}-[0-9]{2}-[0-9]{2}\s[0-9]{2}:[0-9]{2}:[0-9]{2}"/g);
          if (matches?.length) {
            const lastRow = data.slice(data.lastIndexOf(matches[matches.length - 1]));
            const cols = lastRow.split(',');

            const rawTimestamp = cols[0]?.replace(/"/g, '');
            const timestamp = rawTimestamp
              ? fromZonedTime(
                  parse(rawTimestamp, 'yyyy-MM-dd HH:mm:ss', new Date()),
                  'Pacific/Auckland'
                )
              : null;

            if (isTimestampFresh(timestamp)) {
              if (cols.length === 39) {
                // pisa_meteo format
                const avg = Number(cols[23]);
                const gust = Number(cols[26]);
                const bearing = Number(cols[24]);
                const temp = Number(cols[7]);

                windAverage = Number.isNaN(avg) ? null : Math.round(avg * 3.6 * 100) / 100; // m/s -> km/h
                windGust = Number.isNaN(gust) ? null : Math.round(gust * 3.6 * 100) / 100;
                windBearing = Number.isNaN(bearing) ? null : bearing;
                temperature = Number.isNaN(temp) ? null : temp;
              } else if (cols.length === 9) {
                // craigieburn_meteo format - no gust reading
                const avg = Number(cols[6]);
                const bearing = Number(cols[7]);
                const temp = Number(cols[4]);

                windAverage = Number.isNaN(avg) ? null : Math.round(avg * 3.6 * 100) / 100; // m/s -> km/h
                windBearing = Number.isNaN(bearing) ? null : bearing;
                temperature = Number.isNaN(temp) ? null : temp;
              }
            } else {
              logger.warn(`mrc stale data - ${station.externalId}`, {
                service: 'station',
                type: 'mrc'
              });
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch {
          logger.warn(`mrc error - ${station.externalId}`, { service: 'station', type: 'mrc' });
          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
