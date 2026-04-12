import pLimit from 'p-limit';

import { httpClient, logger, type WebcamAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

export default async function scrapeCgcData(webcams: WithId<WebcamAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    webcams.map((webcam) =>
      limit(async () => {
        try {
          const response = await httpClient.get<ArrayBuffer>(
            `https://canterburyglidingclub.nz/images/CGCHdCam${webcam.externalId}_1.jpg`,
            { responseType: 'arraybuffer' }
          );

          const base64 = Buffer.from(response.data).toString('base64');
          const updated = new Date();

          await processScrapedData(webcam, updated, base64);
        } catch {
          logger.warn(`cgc error - ${webcam.externalId}`, {
            service: 'webcam',
            type: 'cgc'
          });
        }
      })
    )
  );
}
