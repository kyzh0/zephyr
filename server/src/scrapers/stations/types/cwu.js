import pLimit from 'p-limit';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import { getWindBearingFromDirection } from '../../../lib/utils.js';
import logger from '../../../lib/logger.js';

export default async function scrapeCwuData(stations) {
  const limit = pLimit(10);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage = null;
          let windGust = null;
          let windBearing = null;
          let temperature = null;

          const { data } = await httpClient.get(
            `https://cwu.co.nz/forecast/${station.externalId}/`,
            {
              responseType: 'text'
            }
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
                if (tempArray.length == 2) {
                  windBearing = getWindBearingFromDirection(tempArray[0]);
                  const temp1 = Number(tempArray[1]);
                  if (!isNaN(temp1)) {
                    windAverage = temp1;
                  }
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
                if (!isNaN(temp)) windGust = temp;
              }
            }

            // temperature
            startStr = 'Now</span><br/>';
            i = data.indexOf(startStr);
            if (i >= 0) {
              const j = data.indexOf('°C</p>', i);
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
          logger.warn(`An error occured while fetching data for cwu - ${station.externalId}`, {
            service: 'station',
            type: 'cwu'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
