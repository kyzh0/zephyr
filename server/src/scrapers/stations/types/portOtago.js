import pLimit from 'p-limit';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/log.js';

export default async function scrapePortOtagoData(stations) {
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
            `https://dvp.portotago.co.nz/dvp/graphs/htmx/get-graph/${station.externalId}`
          );
          if (data.length) {
            // wind avg
            let startStr = '<p class="seriesName">Wind Speed Avg</p>';
            let i = data.indexOf(startStr);
            if (i >= 0) {
              startStr = '<p class="seriesValue">';
              const j = data.indexOf(startStr, i);
              if (j > i) {
                const k = data.indexOf('</p>', j);
                if (k > i) {
                  const temp = Number(data.slice(j + startStr.length, k).trim());
                  if (!isNaN(temp)) windAverage = Math.round(temp * 1.852 * 100) / 100;
                }
              }
            }

            // wind gust
            startStr = '<p class="seriesName">Wind Gust Max</p>';
            i = data.indexOf(startStr);
            if (i >= 0) {
              startStr = '<p class="seriesValue">';
              const j = data.indexOf(startStr, i);
              if (j > i) {
                const k = data.indexOf('</p>', j);
                if (k > i) {
                  const temp = Number(data.slice(j + startStr.length, k).trim());
                  if (!isNaN(temp)) windGust = Math.round(temp * 1.852 * 100) / 100;
                }
              }
            }

            // wind direction
            startStr = '<p class="seriesName">Wind Dir Avg</p>';
            i = data.indexOf(startStr);
            if (i >= 0) {
              startStr = '<p class="seriesValue">';
              const j = data.indexOf(startStr, i);
              if (j > i) {
                const k = data.indexOf('</p>', j);
                if (k > i) {
                  const temp = Number(data.slice(j + startStr.length, k).trim());
                  if (!isNaN(temp)) windBearing = temp;
                }
              }
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch (error) {
          logger.warn(
            `An error occured while fetching data for port otago - ${station.externalId}`,
            {
              service: 'station',
              type: 'po'
            }
          );

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
