import pLimit from 'p-limit';
import { fromZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeLakeWanakaData(cams) {
  const limit = pLimit(5);

  await Promise.allSettled(
    cams.map((cam) =>
      limit(async () => {
        try {
          let updated = null;
          let base64 = null;

          const { data } = await httpClient.get(
            `https://api.lakewanaka.co.nz/webcam/feed/${cam.externalId}`
          );
          const d = data.latest_image;
          if (d && d.timestamp) {
            updated = fromZonedTime(
              parse(d.timestamp, 'yyyy-MM-dd HH:mm:ss', new Date()),
              'Pacific/Auckland'
            );
            // skip if image already up to date
            if (updated > new Date(cam.lastUpdate) && d.url) {
              const response = await httpClient.get(d.url, {
                responseType: 'arraybuffer'
              });
              base64 = Buffer.from(response.data, 'binary').toString('base64');
            }
          }

          await processScrapedData(cam, updated, base64);
        } catch (error) {
          logger.warn(`lake wanaka error - ${cam.externalId}`, {
            service: 'cam',
            type: 'lw'
          });
        }
      })
    )
  );
}
