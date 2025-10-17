import pLimit from 'p-limit';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeEcowittData(stations) {
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
            `https://api.ecowitt.net/api/v3/device/real_time?api_key=${process.env.ECOWITT_API_KEY}&application_key=${process.env.ECOWITT_APPLICATION_KEY}&mac=${station.externalId}&wind_speed_unitid=7&temp_unitid=1`
          );
          const timeNow = Math.round(Date.now() / 1000); // epoch time in s
          if (data && data.data) {
            const d = data.data;
            if (d.wind) {
              const w = d.wind;
              if (w.wind_speed) {
                if (timeNow - Number(w.wind_speed.time) < 20 * 60) {
                  windAverage = Number(w.wind_speed.value);
                }
              }
              if (w.wind_gust) {
                if (timeNow - Number(w.wind_gust.time) < 20 * 60) {
                  windGust = Number(w.wind_gust.value);
                }
              }
              if (w.wind_direction) {
                if (timeNow - Number(w.wind_direction.time) < 20 * 60) {
                  windBearing = Number(w.wind_direction.value);
                }
              }
            }
            if (d.outdoor && d.outdoor.temperature) {
              if (timeNow - Number(d.outdoor.temperature.time) < 20 * 60) {
                temperature = Number(d.outdoor.temperature.value);
              }
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch (error) {
          logger.warn(`ecowitt error - ${station.externalId}`, {
            service: 'station',
            type: 'ecowitt'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
