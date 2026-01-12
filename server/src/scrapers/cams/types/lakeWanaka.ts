import pLimit from 'p-limit';
import { fromZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';

import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/cams/processScrapedData';
import logger from '@/lib/logger';

import { type CamAttrs } from '@/models/camModel';
import { type WithId } from '@/types/mongoose';

type LakeWanakaResponse = {
  latest_image?: {
    timestamp?: string;
    url?: string;
  };
};

export default async function scrapeLakeWanakaData(cams: WithId<CamAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    cams.map((cam) =>
      limit(async () => {
        try {
          let updated: Date | null = null;
          let base64: string | null = null;

          const { data } = await httpClient.get<LakeWanakaResponse>(
            `https://api.lakewanaka.co.nz/webcam/feed/${cam.externalId}`
          );

          const d = data.latest_image;
          if (d?.timestamp) {
            updated = fromZonedTime(
              parse(d.timestamp, 'yyyy-MM-dd HH:mm:ss', new Date()),
              'Pacific/Auckland'
            );

            // skip if image already up to date
            if (updated > new Date(cam.lastUpdate) && d.url) {
              const response = await httpClient.get<ArrayBuffer>(d.url, {
                responseType: 'arraybuffer'
              });
              base64 = Buffer.from(response.data).toString('base64');
            }
          }

          await processScrapedData(cam, updated, base64);
        } catch {
          logger.warn(`lake wanaka error - ${cam.externalId}`, {
            service: 'cam',
            type: 'lw'
          });
        }
      })
    )
  );
}
