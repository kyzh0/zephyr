import { fromZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';
import { getWindBearingFromDirection } from '../../../lib/utils.js';

export default async function scrapeWhanganuiInletData(stations) {
  const station = stations[0];

  try {
    let windAverage = null;
    let windGust = null;
    let windBearing = null;
    let temperature = null;

    const { data } = await httpClient.get('http://whanganuiinletweather.info/');
    if (data.length) {
      let skipUpdate = true;

      // check last update
      let startStr = '<div class="subHeaderRight">Updated: ';
      let i = data.indexOf(startStr);
      if (i >= 0) {
        const j = data.indexOf('</div>', i + startStr.length);
        if (j > i) {
          const temp = data.slice(i + startStr.length, j);
          const lastUpdate = fromZonedTime(
            parse(temp, 'd/M/yyyy hh:mm aa', new Date()),
            'Pacific/Auckland'
          );
          // skip if data older than 20 min
          if (Date.now() - lastUpdate.getTime() < 20 * 60 * 1000) {
            skipUpdate = false;
          }
        }
      }

      if (skipUpdate) {
        return {
          windAverage,
          windGust,
          windBearing,
          temperature
        };
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
            const temp = Number(data.slice(j + startStr1.length, k).trim());
            if (!isNaN(temp)) {
              windAverage = temp;
            }

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
          const temp = Number(data.slice(i + startStr.length, j).trim());
          if (!isNaN(temp)) {
            windGust = temp;
          }
        }
      }

      // temperature
      startStr = '<li>Now:';
      i = data.indexOf(startStr);
      if (i >= 0) {
        const j = data.indexOf('&nbsp;', i);
        if (j > i) {
          const temp = Number(data.slice(i + startStr.length, j).trim());
          if (!isNaN(temp)) {
            temperature = temp;
          }
        }
      }
    }

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch (error) {
    logger.warn('whanganui inlet error', {
      service: 'station',
      type: 'wi'
    });

    await processScrapedData(station, null, null, null, null, true);
  }
}
