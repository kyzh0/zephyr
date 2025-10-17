import pLimit from 'p-limit';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeHarvestData(cams) {
  const limit = pLimit(10);

  await Promise.allSettled(
    cams.map((cam) =>
      limit(async () => {
        try {
          let updated = null;
          let base64 = null;

          const ids = cam.externalId.split('_');
          const { data } = await httpClient.get(
            `https://live.harvest.com/php/device_camera_images_functions.php?device_camera_images&request_type=initial&source_id=9&site_id=${ids[0]}&hsn=${ids[1]}`
          );
          if (data.date_utc) {
            updated = new Date(data.date_utc);
            // skip if image already up to date
            if (updated > new Date(cam.lastUpdate) && data.main_image) {
              base64 = data.main_image.replace('\\/', '/').replace('data:image/jpeg;base64,', '');
            }
          }

          await processScrapedData(cam, updated, base64);
        } catch (error) {
          logger.warn(`harvest error - ${cam.externalId}`, {
            service: 'cam',
            type: 'harvest'
          });
        }
      })
    )
  );
}
