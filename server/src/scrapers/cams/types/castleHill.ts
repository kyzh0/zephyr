import pLimit from 'p-limit';

import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/cams/processScrapedData';
import logger from '@/lib/logger';

import type { CamAttrs } from '@/models/camModel';
import type { WithId } from '@/types/mongoose';

export default async function scrapeCastleHillData(cams: WithId<CamAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    cams.map((cam) =>
      limit(async () => {
        try {
          const response = await httpClient.get<ArrayBuffer>(
            `https://www.castlehill.nz/php/webcam_wll.php?cam=${cam.externalId}`,
            { responseType: 'arraybuffer' }
          );

          const base64 = Buffer.from(response.data).toString('base64');
          const updated = new Date();

          await processScrapedData(cam, updated, base64);
        } catch {
          logger.warn(`castle hill error - ${cam.externalId}`, {
            service: 'cam',
            type: 'ch'
          });
        }
      })
    )
  );
}
