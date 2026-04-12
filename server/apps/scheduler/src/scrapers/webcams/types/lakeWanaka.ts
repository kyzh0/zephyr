import pLimit from 'p-limit';
import { fromZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';

import { httpClient, logger, type WebcamAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

type LakeWanakaResponse = {
  latest_image?: {
    timestamp?: string;
    url?: string;
  };
};

export default async function scrapeLakeWanakaData(webcams: WithId<WebcamAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    webcams.map((webcam) =>
      limit(async () => {
        try {
          let updated: Date | null = null;
          let base64: string | null = null;

          const { data } = await httpClient.get<LakeWanakaResponse>(
            `https://api.lakewanaka.co.nz/webcam/feed/${webcam.externalId}`
          );

          const d = data.latest_image;
          if (d?.timestamp) {
            updated = fromZonedTime(
              parse(d.timestamp, 'yyyy-MM-dd HH:mm:ss', new Date()),
              'Pacific/Auckland'
            );

            // skip if image already up to date
            if (updated > new Date(webcam.lastUpdate) && d.url) {
              const response = await httpClient.get<ArrayBuffer>(d.url, {
                responseType: 'arraybuffer'
              });
              base64 = Buffer.from(response.data).toString('base64');
            }
          }

          await processScrapedData(webcam, updated, base64);
        } catch {
          logger.warn(`lake wanaka error - ${webcam.externalId}`, {
            service: 'webcam',
            type: 'lw'
          });
        }
      })
    )
  );
}
