import pLimit from 'p-limit';

import { httpClient, logger, type WebcamAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

type HarvestResponse = {
  date_utc?: string;
  main_image?: string;
};

export default async function scrapeHarvestData(webcams: WithId<WebcamAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    webcams.map((webcam) =>
      limit(async () => {
        try {
          if (!webcam.externalId || !webcam.externalId) {
            return;
          }

          let updated: Date | null = null;
          let base64: string | null = null;
          const ids = webcam.externalId.split('_');

          const { data } = await httpClient.get<HarvestResponse>(
            `https://live.harvest.com/php/device_camera_images_functions.php?device_camera_images&request_type=initial&source_id=9&site_id=${ids[0]}&hsn=${ids[1]}`
          );

          if (data.date_utc) {
            updated = new Date(data.date_utc);

            // skip if image already up to date
            if (updated > new Date(webcam.lastUpdate) && data.main_image) {
              base64 = data.main_image.replace('\\/', '/').replace('data:image/jpeg;base64,', '');
            }
          }

          await processScrapedData(webcam, updated, base64);
        } catch {
          logger.warn(`harvest error - ${webcam.externalId}`, {
            service: 'webcam',
            type: 'harvest'
          });
        }
      })
    )
  );
}
