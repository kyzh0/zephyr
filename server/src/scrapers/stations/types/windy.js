import pLimit from 'p-limit';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeWindyData(stations) {
  const limit = pLimit(5);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage = null;
          let windGust = null;
          let windBearing = null;
          const temperature = null;

          const { data } = await httpClient.get(
            `https://node.windy.com/pois/v2/wind/${station.externalId}`
          );
          if (data && Date.now() - new Date(data.time).getTime() < 20 * 60 * 1000) {
            windAverage = Math.round(data.wind * 3.6 * 100) / 100;
            windGust = Math.round(data.gust * 3.6 * 100) / 100;
            windBearing = data.dir;
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch (error) {
          logger.warn(`windy error - ${station.externalId}`, {
            service: 'station',
            type: 'windy'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
