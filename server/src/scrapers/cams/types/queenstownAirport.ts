import pLimit from 'p-limit';

import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/cams/processScrapedData';
import logger from '@/lib/logger';

import { type CamAttrs } from '@/models/camModel';
import { type WithId } from '@/types/mongoose';

export default async function scrapeQueenstownAirportData(cams: WithId<CamAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    cams.map((cam) =>
      limit(async () => {
        try {
          let updated: Date | null = null;
          let base64: string | null = null;

          const dateTimeFormat = new Intl.DateTimeFormat('en-NZ', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: false,
            timeZone: 'Pacific/Auckland'
          });

          const parts = dateTimeFormat.formatToParts(new Date());

          let year = '';
          let month = '';
          let day = '';
          let hour = '';
          let minute = '';

          for (const p of parts) {
            switch (p.type) {
              case 'year':
                year = p.value;
                break;
              case 'month':
                month = p.value.padStart(2, '0');
                break;
              case 'day':
                day = p.value.padStart(2, '0');
                break;
              case 'hour':
                hour = p.value.padStart(2, '0');
                break;
              case 'minute':
                minute = p.value.padStart(2, '0');
                break;
            }
          }

          const response = await httpClient.get<ArrayBuffer>(
            `https://www.queenstownairport.co.nz/WebCam/${cam.externalId}.jpg?dt=${year}-${month}-${day}-${hour}-${minute}`,
            { responseType: 'arraybuffer' }
          );

          const contentType = response.headers['content-type'];
          if (response.status === 200 && contentType === 'image/jpeg') {
            base64 = Buffer.from(response.data).toString('base64');
            updated = new Date();
          }

          await processScrapedData(cam, updated, base64);
        } catch {
          logger.warn(`queenstown airport error - ${cam.externalId}`, {
            service: 'cam',
            type: 'qa'
          });
        }
      })
    )
  );
}
