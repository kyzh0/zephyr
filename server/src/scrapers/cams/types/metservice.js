import pLimit from 'p-limit';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeMetserviceData(cams) {
  const limit = pLimit(10);

  await Promise.allSettled(
    cams.map((cam) =>
      limit(async () => {
        try {
          let updated = null;
          let base64 = null;

          const { data } = await httpClient.get(
            `https://www.metservice.com/publicData/webdata/traffic-camera/${cam.externalId}`
          );
          const modules = data.layout.secondary.slots.major.modules;
          if (modules && modules.length) {
            const sets = modules[0].sets;
            if (sets && sets.length) {
              const times = sets[0].times;
              if (times.length) {
                const d = times[times.length - 1];
                if (d.displayTime) {
                  updated = new Date(d.displayTime);
                  // skip if image already up to date
                  if (updated > new Date(cam.lastUpdate) && d.url) {
                    const response = await httpClient.get(`https://www.metservice.com${d.url}`, {
                      responseType: 'arraybuffer'
                    });
                    base64 = Buffer.from(response.data, 'binary').toString('base64');
                  }
                }
              }
            }
          }

          await processScrapedData(cam, updated, base64);
        } catch (error) {
          logger.warn(`An error occured while fetching data for metservice - ${cam.externalId}`, {
            service: 'cam',
            type: 'metservice'
          });
        }
      })
    )
  );
}
