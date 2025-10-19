import pLimit from 'p-limit';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeWeatherProData(stations) {
  const limit = pLimit(5);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage = null;
          const windGust = null;
          let windBearing = null;
          let temperature = null;

          const { data } = await httpClient.get(
            `https://www.weather-pro.com/reports/Realtime.php?SN=${station.externalId}`
          );
          if (data.length) {
            // wind avg
            let startStr = 'Wind Speed</td><td style="font-size:200%;">:';
            let i = data.indexOf(startStr);
            if (i >= 0) {
              const j = data.indexOf('kph</td></tr>', i);
              if (j > i) {
                const temp = Number(data.slice(i + startStr.length, j).trim());
                if (!isNaN(temp)) {
                  windAverage = temp;
                }
              }
            }

            // wind direction
            startStr = 'Wind Direction</td><td style="font-size:200%;">:';
            i = data.indexOf(startStr);
            if (i >= 0) {
              const j = data.indexOf('°</td></tr>', i);
              if (j > i) {
                const temp = Number(data.slice(i + startStr.length, j).trim());
                if (!isNaN(temp)) {
                  windBearing = temp;
                }
              }
            }

            // temperature
            startStr = 'Air Temperature</td><td style="font-size:200%;">:';
            i = data.indexOf(startStr);
            if (i >= 0) {
              const j = data.indexOf('°C</td></tr>', i);
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
          logger.warn(`weatherpro error - ${station.externalId}`, {
            service: 'station',
            type: 'wp'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
