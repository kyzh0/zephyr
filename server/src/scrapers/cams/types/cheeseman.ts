import pLimit from 'p-limit';
import { fromZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';

import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/cams/processScrapedData';
import logger from '@/lib/logger';

import { type CamAttrs } from '@/models/camModel';
import { type WithId } from '@/types/mongoose';

export default async function scrapeCheesemanData(cams: WithId<CamAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    cams.map((cam) =>
      limit(async () => {
        try {
          let updated: Date | null = null;
          let base64: string | null = null;

          const { data } = await httpClient.get<string>(
            `https://www.mtcheeseman.co.nz/wp-content/webcam-player/?cam=${cam.externalId}`
          );

          if (data.length) {
            const matches = data.match(
              /\/wp-content\/webcam\/aframe\/\d{4}-\d{2}-\d{2}\/\d{12}\.jpg/g
            );

            if (matches?.length) {
              const url = matches[matches.length - 1];
              const match = url.match(/\d{12}/g);

              if (match?.[0]) {
                updated = fromZonedTime(
                  parse(match[0], 'yyyyMMddHHmm', new Date()),
                  'Pacific/Auckland'
                );

                // skip if image already up to date
                if (updated > new Date(cam.lastUpdate)) {
                  const response = await httpClient.get<ArrayBuffer>(
                    `https://www.mtcheeseman.co.nz${url}`,
                    { responseType: 'arraybuffer' }
                  );
                  base64 = Buffer.from(response.data).toString('base64');
                }
              }
            }
          }

          await processScrapedData(cam, updated, base64);
        } catch {
          logger.warn(`cheeseman error - ${cam.externalId}`, {
            service: 'cam',
            type: 'cm'
          });
        }
      })
    )
  );
}
