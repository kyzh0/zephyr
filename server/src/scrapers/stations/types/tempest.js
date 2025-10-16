import pLimit from 'p-limit';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeTempestData(stations) {
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
            `https://swd.weatherflow.com/swd/rest/better_forecast?api_key=${process.env.TEMPEST_KEY}&station_id=${station.externalId}&units_temp=c&units_wind=kph`,
            {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0'
              }
            }
          );
          const cc = data.current_conditions;
          if (cc) {
            windAverage = cc.wind_avg;
            windGust = cc.wind_gust;
            windBearing = cc.wind_direction;
            temperature = cc.air_temperature;
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch (error) {
          logger.warn(`An error occured while fetching data for tempest - ${station.externalId}`, {
            service: 'station',
            type: 'tempest'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
