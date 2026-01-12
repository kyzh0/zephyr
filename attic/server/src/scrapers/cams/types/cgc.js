import pLimit from 'p-limit';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeCgcData(cams) {
  const limit = pLimit(5);

  await Promise.allSettled(
    cams.map((cam) =>
      limit(async () => {
        try {
          let updated = null;
          let base64 = null;

          const response = await httpClient.get(
            `https://canterburyglidingclub.nz/images/CGCHdCam${cam.externalId}_1.jpg`,
            {
              responseType: 'arraybuffer'
            }
          );
          base64 = Buffer.from(response.data, 'binary').toString('base64');
          updated = new Date();

          await processScrapedData(cam, updated, base64);
        } catch (error) {
          logger.warn(`cgc error - ${cam.externalId}`, {
            service: 'cam',
            type: 'cgc'
          });
        }
      })
    )
  );
}
