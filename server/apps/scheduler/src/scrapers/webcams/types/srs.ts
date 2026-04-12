import pLimit from 'p-limit';
import { fromZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';

import { httpClient, logger, type WebcamAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

type SrsResponse = {
  error: string | null;
  images: {
    name: string;
    url: string;
  }[];
};

export default async function scrapeSrsData(webcams: WithId<WebcamAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    webcams.map((webcam) =>
      limit(async () => {
        try {
          let updated: Date | null = null;
          let base64: string | null = null;

          const { data } = await httpClient.get<SrsResponse>(
            `https://hills.treshna.com/get_imagelist?camera=${webcam.externalId}`
          );
          if (data && data.images.length) {
            const img = data.images[data.images.length - 1];
            const response = await httpClient.get<ArrayBuffer>(
              `https://hills.treshna.com${img.url}`,
              { responseType: 'arraybuffer' }
            );

            base64 = Buffer.from(response.data).toString('base64');
            updated = fromZonedTime(
              parse(img.name, 'dd MMMM yyyy hh:mmaa', new Date()),
              'Pacific/Auckland'
            );
          }

          await processScrapedData(webcam, updated, base64);
        } catch {
          logger.warn(`summit road society error - ${webcam.externalId}`, {
            service: 'webcam',
            type: 'srs'
          });
        }
      })
    )
  );
}
