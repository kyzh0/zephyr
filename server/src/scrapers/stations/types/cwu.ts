import pLimit from 'p-limit';

import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/stations/processScrapedData';
import { getWindBearingFromDirection } from '@/lib/utils';
import logger from '@/lib/logger';

import type { StationDoc } from '@/models/stationModel';

export default async function scrapeCwuData(stations: StationDoc[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage: number | null = null;
          let windGust: number | null = null;
          let windBearing: number | null = null;
          let temperature: number | null = null;

          const { data } = await httpClient.get<string>(
            `https://cwu.co.nz/forecast/${station.externalId}/`,
            { responseType: 'text' }
          );

          if (data.length) {
            // wind avg + direction
            let startStr = 'Current Windspeed:&nbsp;</label><span>&nbsp;';
            let i = data.indexOf(startStr);
            if (i >= 0) {
              const j = data.indexOf('km/h.</span>', i);
              if (j > i) {
                const tempArray = data
                  .slice(i + startStr.length, j)
                  .trim()
                  .split(' ');
                if (tempArray.length === 2) {
                  windBearing = getWindBearingFromDirection(tempArray[0]);
                  const temp1 = Number(tempArray[1]);
                  if (!Number.isNaN(temp1)) windAverage = temp1;
                }
              }
            }

            // wind gust
            startStr = 'Wind Gusting To:&nbsp;</label><span>&nbsp;';
            i = data.indexOf(startStr);
            if (i >= 0) {
              const j = data.indexOf('km/h.</span>', i);
              if (j > i) {
                const temp = Number(data.slice(i + startStr.length, j).trim());
                if (!Number.isNaN(temp)) windGust = temp;
              }
            }

            // temperature
            startStr = 'Now</span><br/>';
            i = data.indexOf(startStr);
            if (i >= 0) {
              const j = data.indexOf('°C</p>', i);
              if (j > i) {
                const temp = Number(data.slice(i + startStr.length, j).trim());
                if (!Number.isNaN(temp)) temperature = temp;
              }
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch {
          logger.warn(`cwu error - ${station.externalId}`, {
            service: 'station',
            type: 'cwu'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
