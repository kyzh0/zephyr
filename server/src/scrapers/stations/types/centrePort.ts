import pLimit from 'p-limit';

import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/stations/processScrapedData';
import logger from '@/lib/logger';

import type { StationAttrs } from '@/models/stationModel';
import type { WithId } from '@/types/mongoose';

type CentrePortBaringHeadRow = {
  speed_kn: number;
  gust_kn: number;
  from_deg: number;
};

type CentrePortGenericRow = {
  WindSpd_01MnAvg: number;
  WindGst_01MnMax: number;
  WindDir_01MnAvg: string | number;
};

export default async function scrapeCentrePortData(
  stations: WithId<StationAttrs>[]
): Promise<void> {
  const limit = pLimit(5);

  const dateFrom = new Date(Date.now() - 720 * 60 * 1000); // current time - 12h
  const dateTo = new Date(dateFrom.getTime() + 1081 * 60 * 1000); // date from + 18h 1min

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage: number | null = null;
          let windGust: number | null = null;
          let windBearing: number | null = null;
          const temperature: number | null = null;

          const baseUrl =
            'https://portweather-public.omcinternational.com/api/datasources/proxy/393//api/data/transformRecordsFromPackets';

          const headers = { 'x-grafana-org-id': 338, Connection: 'keep-alive' as const };

          if (station.externalId === 'BaringHead') {
            const sourcePath = `NZ/Wellington/Wind/Measured/NIWA-API/${station.externalId}`;

            const { data } = await httpClient.get<CentrePortBaringHeadRow[]>(
              `${baseUrl}` +
                `?sourcePath=${encodeURIComponent(sourcePath)}` +
                `&transformer=LatestNoTransform` +
                `&fromDate_Utc=${encodeURIComponent(dateFrom.toISOString())}` +
                `&toDate_Utc=${encodeURIComponent(dateTo.toISOString())}` +
                `&qaStatusesString=*`,
              { headers }
            );

            if (data.length && data[0]) {
              windAverage = Math.round(data[0].speed_kn * 1.852 * 100) / 100; // kt -> km/h
              windGust = Math.round(data[0].gust_kn * 1.852 * 100) / 100;
              windBearing = data[0].from_deg;
            }
          } else {
            const sourcePath = `NZ/Wellington/Wind/Measured/${station.externalId}`;

            const { data } = await httpClient.get<CentrePortGenericRow[]>(
              `${baseUrl}` +
                `?sourcePath=${encodeURIComponent(sourcePath)}` +
                `&transformer=LatestNoTransform` +
                `&fromDate_Utc=${encodeURIComponent(dateFrom.toISOString())}` +
                `&toDate_Utc=${encodeURIComponent(dateTo.toISOString())}` +
                `&qaStatusesString=*`,
              { headers }
            );

            if (data.length && data[0]) {
              windAverage = Math.round(data[0].WindSpd_01MnAvg * 1.852 * 100) / 100; // kt -> km/h
              windGust = Math.round(data[0].WindGst_01MnMax * 1.852 * 100) / 100;
              windBearing = Number(data[0].WindDir_01MnAvg);
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch {
          logger.warn(`centreport error - ${station.externalId}`, {
            service: 'station',
            type: 'cp'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
