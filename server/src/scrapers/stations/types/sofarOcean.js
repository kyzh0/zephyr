import pLimit from 'p-limit';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/log.js';

export default async function scrapeSofarOceanData(stations) {
  const limit = pLimit(10);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage = null;
          const windGust = null;
          let windBearing = null;
          let temperature = null;

          const { data } = await httpClient.post(
            'https://api.sofarocean.com/fetch/devices/',
            {
              devices: [{ spotterId: station.externalId }]
            },
            {
              headers: {
                view_token: process.env.SOFAROCEAN_KEY
              }
            }
          );
          if (data && data.data) {
            const currentConditions = data.data.currentConditions;
            if (currentConditions && currentConditions.length === 1) {
              const lastUpdate = new Date(currentConditions[0].timeLastUpdatedUTC).getTime();
              // only update if data is less than 15 min old
              if (Date.now() - lastUpdate < 15 * 60 * 1000) {
                temperature = currentConditions[0].temperature;
                const wind = currentConditions[0].wind;
                if (wind) {
                  windAverage = wind.speed * 3.6; // m/s
                  windBearing = wind.direction;
                }
              }
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch (error) {
          logger.warn(
            `An error occured while fetching data for sofarocean - ${station.externalId}`,
            {
              service: 'station',
              type: 'sfo'
            }
          );

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
