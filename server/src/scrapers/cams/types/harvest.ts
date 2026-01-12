import pLimit from 'p-limit';

import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/cams/processScrapedData';
import logger from '@/lib/logger';

import { type CamAttrs } from '@/models/camModel';
import { type WithId } from '@/types/mongoose';

type HarvestResponse = {
  date_utc?: string;
  main_image?: string;
};

export default async function scrapeHarvestData(cams: WithId<CamAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    cams.map((cam) =>
      limit(async () => {
        try {
          if (!cam.externalId || !cam.externalId) return;

          let updated: Date | null = null;
          let base64: string | null = null;
          const ids = cam.externalId.split('_');

          const { data } = await httpClient.get<HarvestResponse>(
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
        } catch {
          logger.warn(`harvest error - ${cam.externalId}`, {
            service: 'cam',
            type: 'harvest'
          });
        }
      })
    )
  );
}
