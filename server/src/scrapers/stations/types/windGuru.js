import pLimit from 'p-limit';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeWindGuruData(stations) {
  const limit = pLimit(5);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage = null;
          let windGust = null;
          let windBearing = null;
          let temperature = null;

          const { data } = await httpClient.get(
            `https://www.windguru.cz/int/iapi.php?q=station_data_current&id_station=${station.externalId}`,
            {
              headers: {
                Referer: `https://www.windguru.cz/station/${station.externalId}`
              }
            }
          );
          if (data) {
            windAverage = Math.round(data.wind_avg * 1.852 * 100) / 100;
            windGust = Math.round(data.wind_max * 1.852 * 100) / 100;
            windBearing = data.wind_direction;
            temperature = data.temperature;
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch (error) {
          logger.warn(`windguru error - ${station.externalId}`, {
            service: 'station',
            type: 'windguru'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
