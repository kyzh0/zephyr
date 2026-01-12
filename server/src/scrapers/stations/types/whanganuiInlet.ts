import { fromZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';

import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/stations/processScrapedData';
import logger from '@/lib/logger';
import { getWindBearingFromDirection } from '@/lib/utils';

import type { StationDoc } from '@/models/stationModel';

export default async function scrapeWhanganuiInletData(stations: StationDoc[]): Promise<void> {
  const station = stations[0];
  if (!station) return;

  try {
    let windAverage: number | null = null;
    let windGust: number | null = null;
    let windBearing: number | null = null;
    let temperature: number | null = null;

    const { data } = await httpClient.get<string>('http://whanganuiinletweather.info/');
    if (data.length) {
      let skipUpdate = true;

      // check last update
      let startStr = '<div class="subHeaderRight">Updated: ';
      let i = data.indexOf(startStr);
      if (i >= 0) {
        const j = data.indexOf('</div>', i + startStr.length);
        if (j > i) {
          const text = data.slice(i + startStr.length, j).trim();

          const lastUpdate = fromZonedTime(
            parse(text, 'd/M/yyyy hh:mm aa', new Date()),
            'Pacific/Auckland'
          );

          // skip if data older than 20 min
          if (
            !Number.isNaN(lastUpdate.getTime()) &&
            Date.now() - lastUpdate.getTime() < 20 * 60 * 1000
          ) {
            skipUpdate = false;
          }
        }
      }

      if (skipUpdate) {
        await processScrapedData(station, null, null, null, null);
        return;
      }

      // wind avg + direction
      startStr = '<p class="sideBarTitle">Wind</p>';
      i = data.indexOf(startStr);
      if (i >= 0) {
        const startStr1 = '<li>Current: ';
        const j = data.indexOf(startStr1, i + startStr.length);
        if (j > i) {
          const k = data.indexOf(' ', j + startStr1.length);
          if (k > j) {
            const n = Number(data.slice(j + startStr1.length, k).trim());
            if (!Number.isNaN(n)) windAverage = n;

            const l = data.indexOf('</li>', k);
            if (l > k) {
              windBearing = getWindBearingFromDirection(data.slice(k, l).trim());
            }
          }
        }
      }

      // wind gust
      startStr = '<li>Gust: ';
      i = data.indexOf(startStr);
      if (i >= 0) {
        const j = data.indexOf(' ', i + startStr.length);
        if (j > i) {
          const n = Number(data.slice(i + startStr.length, j).trim());
          if (!Number.isNaN(n)) windGust = n;
        }
      }

      // temperature
      startStr = '<li>Now:';
      i = data.indexOf(startStr);
      if (i >= 0) {
        const j = data.indexOf('&nbsp;', i);
        if (j > i) {
          const n = Number(data.slice(i + startStr.length, j).trim());
          if (!Number.isNaN(n)) temperature = n;
        }
      }
    }

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch {
    logger.warn('whanganui inlet error', { service: 'station', type: 'wi' });
    await processScrapedData(station, null, null, null, null, true);
  }
}
