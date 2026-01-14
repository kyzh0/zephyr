import pLimit from 'p-limit';

import { httpClient, logger, type CamAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

export default async function scrapeCgcData(cams: WithId<CamAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    cams.map((cam) =>
      limit(async () => {
        try {
          const response = await httpClient.get<ArrayBuffer>(
            `https://canterburyglidingclub.nz/images/CGCHdCam${cam.externalId}_1.jpg`,
            { responseType: 'arraybuffer' }
          );

          const base64 = Buffer.from(response.data).toString('base64');
          const updated = new Date();

          await processScrapedData(cam, updated, base64);
        } catch {
          logger.warn(`cgc error - ${cam.externalId}`, {
            service: 'cam',
            type: 'cgc'
          });
        }
      })
    )
  );
}
