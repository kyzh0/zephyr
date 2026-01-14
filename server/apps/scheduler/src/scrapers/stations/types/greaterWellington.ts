import pLimit from 'p-limit';
import { formatInTimeZone } from 'date-fns-tz';

import { httpClient, logger, type StationAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

function extractLastI1Number(xml: string): number | null {
  const matches = xml.match(/<I1>\d+.?\d*<\/I1>/g);
  if (!matches?.length) {
    return null;
  }

  const last = matches[matches.length - 1].replace('<I1>', '').replace('</I1>', '');
  const n = Number(last);
  return Number.isFinite(n) ? n : null;
}

export default async function scrapeGreaterWellingtonData(
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

          // dates are always in NZST ignoring daylight savings
          const dateTo = new Date();
          const dateFrom = new Date(dateTo.getTime() - 30 * 60 * 1000);

          const url =
            'https://hilltop.gw.govt.nz/Data.hts/?Service=Hilltop&Request=GetData' +
            `&Site=${encodeURIComponent(station.externalId ?? '')}` +
            `&From=${encodeURIComponent(formatInTimeZone(dateFrom, '+12', 'yyyy-MM-dd HH:mm:ss'))}` +
            `&To=${encodeURIComponent(formatInTimeZone(dateTo, '+12', 'yyyy-MM-dd HH:mm:ss'))}`;

          // wind avg
          if (station.gwWindAverageFieldName) {
            const { data } = await httpClient.get<string>(
              url + `&Measurement=${encodeURIComponent(station.gwWindAverageFieldName)}`
            );
            if (data.length) {
              windAverage = extractLastI1Number(data);
            }
          }

          // wind gust
          if (station.gwWindGustFieldName) {
            const { data } = await httpClient.get<string>(
              url + `&Measurement=${encodeURIComponent(station.gwWindGustFieldName)}`
            );
            if (data.length) {
              windGust = extractLastI1Number(data);
            }
          }

          // wind bearing
          if (station.gwWindBearingFieldName) {
            const { data } = await httpClient.get<string>(
              url + `&Measurement=${encodeURIComponent(station.gwWindBearingFieldName)}`
            );
            if (data.length) {
              windBearing = extractLastI1Number(data);
            }
          }

          // temperature
          if (station.gwTemperatureFieldName) {
            const { data } = await httpClient.get<string>(
              url + `&Measurement=${encodeURIComponent(station.gwTemperatureFieldName)}`
            );
            if (data.length) {
              temperature = extractLastI1Number(data);
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch {
          logger.warn(`gw error - ${station.externalId}`, {
            service: 'station',
            type: 'gw'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
