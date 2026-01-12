import pLimit from 'p-limit';
import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/cams/processScrapedData';
import logger from '@/lib/logger';

import { type CamAttrs } from '@/models/camModel';
import { type WithId } from '@/types/mongoose';

export default async function scrapeArthursPassData(cams: WithId<CamAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    cams.map((cam) =>
      limit(async () => {
        try {
          const response = await httpClient.get<ArrayBuffer>(
            `https://www.arthurspass.com/webcams/webcam3.php?id=D&unique_id=${cam.externalId}`,
            { responseType: 'arraybuffer' }
          );

          const base64 = Buffer.from(response.data).toString('base64');
          const updated = new Date();

          await processScrapedData(cam, updated, base64);
        } catch {
          logger.warn(`ap error - ${cam.externalId}`, {
            service: 'cam',
            type: 'ap'
          });
        }
      })
    )
  );
}
