import pLimit from 'p-limit';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/log.js';

export default async function scrapePredictWindData(stations) {
  const limit = pLimit(10);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage = null;
          let windGust = null;
          let windBearing = null;
          const temperature = null;

          const { data } = await httpClient.get(
            `https://forecast.predictwind.com/observations/jardines.json?api_key=${process.env.PREDICTWIND_KEY}`
          );
          if (data && data.samples.length) {
            for (const s of data.samples) {
              if (s.id.toString() === station.externalId) {
                windAverage = Math.round(s.tws * 1.852 * 100) / 100;
                windGust = Math.round(s.gust * 1.852 * 100) / 100;
                windBearing = s.twd;
                break;
              }
            }
          }
          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch (error) {
          logger.warn(
            `An error occured while fetching data for predictwind - ${station.externalId}`,
            {
              service: 'station',
              type: 'pw'
            }
          );

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
