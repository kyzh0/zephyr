import pLimit from 'p-limit';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeAucklandCouncilData(stations) {
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
            `https://coastalmonitoringac.netlify.app/.netlify/functions/obscapeProxy?station=${station.externalId}&parameters=Tp,Uw,Uwdir,invalid&latest=1`
          );
          if (data && data.data.length === 1) {
            const d = data.data[0];
            // ignore data older than 40 mins
            if (d.invalid === '0' && Date.now() - Number(d.time) * 1000 < 40 * 60 * 1000) {
              windAverage = d.Uw * 3.6;
              windBearing = d.Uwdir;
              temperature = d.Tp;
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch (error) {
          logger.warn(`ac error - ${station.externalId}`, {
            service: 'station',
            type: 'ac'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
