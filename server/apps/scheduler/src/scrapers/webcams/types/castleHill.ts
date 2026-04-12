import pLimit from 'p-limit';

import { httpClient, logger, type WebcamAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

export default async function scrapeCastleHillData(webcams: WithId<WebcamAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    webcams.map((webcam) =>
      limit(async () => {
        try {
          const response = await httpClient.get<ArrayBuffer>(
            `https://www.castlehill.nz/php/webcam_wll.php?cam=${webcam.externalId}`,
            { responseType: 'arraybuffer' }
          );

          const base64 = Buffer.from(response.data).toString('base64');
          const updated = new Date();

          await processScrapedData(webcam, updated, base64);
        } catch {
          logger.warn(`castle hill error - ${webcam.externalId}`, {
            service: 'webcam',
            type: 'ch'
          });
        }
      })
    )
  );
}
