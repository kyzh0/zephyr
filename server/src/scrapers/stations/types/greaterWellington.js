import pLimit from 'p-limit';
import { formatInTimeZone } from 'date-fns-tz';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeGreaterWellingtonData(stations) {
  const limit = pLimit(5);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage = null;
          let windGust = null;
          let windBearing = null;
          let temperature = null;

          // dates are always in NZST ignoring daylight savings
          const dateTo = new Date();
          const dateFrom = new Date(dateTo.getTime() - 30 * 60 * 1000);
          const url =
            'https://hilltop.gw.govt.nz/Data.hts/?Service=Hilltop&Request=GetData' +
            `&Site=${encodeURIComponent(station.externalId)}` +
            `&From=${encodeURIComponent(formatInTimeZone(dateFrom, '+12', 'yyyy-MM-dd HH:mm:ss'))}` +
            `&To=${encodeURIComponent(formatInTimeZone(dateTo, '+12', 'yyyy-MM-dd HH:mm:ss'))}`;

          // wind avg
          if (station.gwWindAverageFieldName) {
            const { data } = await httpClient.get(
              url + `&Measurement=${encodeURIComponent(station.gwWindAverageFieldName)}`
            );
            if (data.length) {
              const matches = data.match(/<I1>\d+.?\d*<\/I1>/g);
              if (matches && matches.length) {
                windAverage = Number(
                  matches[matches.length - 1].replace('<I1>', '').replace('</I1>', '')
                );
              }
            }
          }

          // wind gust
          if (station.gwWindGustFieldName) {
            const { data } = await httpClient.get(
              url + `&Measurement=${encodeURIComponent(station.gwWindGustFieldName)}`
            );
            if (data.length) {
              const matches = data.match(/<I1>\d+.?\d*<\/I1>/g);
              if (matches && matches.length) {
                windGust = Number(
                  matches[matches.length - 1].replace('<I1>', '').replace('</I1>', '')
                );
              }
            }
          }

          // wind bearing
          if (station.gwWindBearingFieldName) {
            const { data } = await httpClient.get(
              url + `&Measurement=${encodeURIComponent(station.gwWindBearingFieldName)}`
            );
            if (data.length) {
              const matches = data.match(/<I1>\d+.?\d*<\/I1>/g);
              if (matches && matches.length) {
                windBearing = Number(
                  matches[matches.length - 1].replace('<I1>', '').replace('</I1>', '')
                );
              }
            }
          }

          // temperature
          if (station.gwTemperatureFieldName) {
            const { data } = await httpClient.get(
              url + `&Measurement=${encodeURIComponent(station.gwTemperatureFieldName)}`
            );
            if (data.length) {
              const matches = data.match(/<I1>\d+.?\d*<\/I1>/g);
              if (matches && matches.length) {
                temperature = Number(
                  matches[matches.length - 1].replace('<I1>', '').replace('</I1>', '')
                );
              }
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch (error) {
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
