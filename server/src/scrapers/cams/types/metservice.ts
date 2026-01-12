import pLimit from 'p-limit';

import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/cams/processScrapedData';
import logger from '@/lib/logger';

import type { CamAttrs } from '@/models/camModel';
import type { WithId } from '@/types/mongoose';

type MetserviceResponse = {
  layout?: {
    secondary?: {
      slots?: {
        major?: {
          modules?: Array<{
            sets?: Array<{
              times?: Array<{
                displayTime?: string;
                url?: string;
              }>;
            }>;
          }>;
        };
      };
    };
  };
};

export default async function scrapeMetserviceData(cams: WithId<CamAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    cams.map((cam) =>
      limit(async () => {
        try {
          let updated: Date | null = null;
          let base64: string | null = null;

          const { data } = await httpClient.get<MetserviceResponse>(
            `https://www.metservice.com/publicData/webdata/traffic-camera/${cam.externalId}`
          );

          const modules = data.layout?.secondary?.slots?.major?.modules;
          const d = modules?.[0]?.sets?.[0]?.times?.at(-1);

          if (d?.displayTime) {
            updated = new Date(d.displayTime);

            // skip if image already up to date
            if (updated > new Date(cam.lastUpdate) && d.url) {
              const response = await httpClient.get<ArrayBuffer>(
                `https://www.metservice.com${d.url}`,
                { responseType: 'arraybuffer' }
              );
              base64 = Buffer.from(response.data).toString('base64');
            }
          }

          await processScrapedData(cam, updated, base64);
        } catch {
          logger.warn(`metservice error - ${cam.externalId}`, {
            service: 'cam',
            type: 'metservice'
          });
        }
      })
    )
  );
}
