import pLimit from 'p-limit';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeCastleHillData(cams) {
  const limit = pLimit(10);

  await Promise.allSettled(
    cams.map((cam) =>
      limit(async () => {
        try {
          let updated = null;
          let base64 = null;

          const response = await httpClient.get(
            `https://www.castlehill.nz/php/webcam_wll.php?cam=${cam.externalId}/webcam.php.jpg`,
            {
              responseType: 'arraybuffer'
            }
          );
          base64 = Buffer.from(response.data, 'binary').toString('base64');
          updated = new Date();

          await processScrapedData(cam, updated, base64);
        } catch (error) {
          logger.warn(`An error occured while fetching data for castle hill - ${cam.externalId}`, {
            service: 'cam',
            type: 'ch'
          });
        }
      })
    )
  );
}
