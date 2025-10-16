import pLimit from 'p-limit';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/log.js';

export default async function scrapeCentrePortData(stations) {
  const limit = pLimit(10);

  const dateFrom = new Date(Date.now() - 720 * 60 * 1000); // current time - 12h
  const dateTo = new Date(dateFrom.getTime() + 1081 * 60 * 1000); // date from + 18h 1min
  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage = null;
          let windGust = null;
          let windBearing = null;
          let temperature = null;

          if (station.externalId === 'BaringHead') {
            const { data } = await httpClient.get(
              'https://portweather-public.omcinternational.com/api/datasources/proxy/393//api/data/transformRecordsFromPackets' +
                `?sourcePath=${encodeURIComponent(`NZ/Wellington/Wind/Measured/NIWA-API/${station.externalId}`)}` +
                '&transformer=LatestNoTransform' +
                `&fromDate_Utc=${encodeURIComponent(dateFrom.toISOString())}` +
                `&toDate_Utc=${encodeURIComponent(dateTo.toISOString())}` +
                '&qaStatusesString=*',
              {
                headers: { 'x-grafana-org-id': 338, Connection: 'keep-alive' }
              }
            );
            if (data.length && data[0]) {
              windAverage = Math.round(data[0].speed_kn * 1.852 * 100) / 100; // data is in kt
              windGust = Math.round(data[0].gust_kn * 1.852 * 100) / 100;
              windBearing = data[0].from_deg;
            }
          } else {
            const { data } = await httpClient.get(
              'https://portweather-public.omcinternational.com/api/datasources/proxy/393//api/data/transformRecordsFromPackets' +
                `?sourcePath=${encodeURIComponent(`NZ/Wellington/Wind/Measured/${station.externalId}`)}` +
                '&transformer=LatestNoTransform' +
                `&fromDate_Utc=${encodeURIComponent(dateFrom.toISOString())}` +
                `&toDate_Utc=${encodeURIComponent(dateTo.toISOString())}` +
                '&qaStatusesString=*',
              {
                headers: { 'x-grafana-org-id': 338, Connection: 'keep-alive' }
              }
            );
            if (data.length && data[0]) {
              windAverage = Math.round(data[0].WindSpd_01MnAvg * 1.852 * 100) / 100; // data is in kt
              windGust = Math.round(data[0].WindGst_01MnMax * 1.852 * 100) / 100;
              windBearing = Number(data[0].WindDir_01MnAvg);
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch (error) {
          logger.warn(
            `An error occured while fetching data for centre port - ${station.externalId}`,
            {
              service: 'station',
              type: 'cp'
            }
          );

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
