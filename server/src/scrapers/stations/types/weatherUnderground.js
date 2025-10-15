import pLimit from 'p-limit';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/log.js';

export default async function scrapeWeatherUndergroundData(stations) {
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
            `https://api.weather.com/v2/pws/observations/current?apiKey=${process.env.WUNDERGROUND_KEY}&stationId=${station.externalId}&numericPrecision=decimal&format=json&units=m`
          );
          const observations = data.observations;
          if (observations && observations.length) {
            windBearing = observations[0].winddir;
            const d = observations[0].metric;
            if (d) {
              windAverage = d.windSpeed;
              windGust = d.windGust;
              temperature = d.temp;
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch (error) {
          logger.warn(
            `An error occured while fetching data for weatherunderground - ${station.externalId}`,
            {
              service: 'station',
              type: 'wu'
            }
          );
        }
      })
    )
  );
}
