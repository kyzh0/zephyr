import pLimit from 'p-limit';

import { httpClient, logger, type WebcamAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

export default async function scrapeSeeItData(webcams: WithId<WebcamAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    webcams.map((webcam) =>
      limit(async () => {
        try {
          let updated: Date | null = null;
          let base64: string | null = null;

          const response = await httpClient.get<ArrayBuffer>(
            `https://www.seeit.kiwi/api/images/camera/${webcam.externalId}`,
            { responseType: 'arraybuffer' }
          );

          const contentType = response.headers['content-type'];
          if (response.status === 200 && contentType === 'image/jpeg') {
            base64 = Buffer.from(response.data).toString('base64');
            updated = new Date(response.headers['date']);
          }

          await processScrapedData(webcam, updated, base64);
        } catch {
          logger.warn(`seeit error - ${webcam.externalId}`, {
            service: 'webcam',
            type: 'seeit'
          });
        }
      })
    )
  );
}
