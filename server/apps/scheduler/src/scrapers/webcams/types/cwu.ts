import pLimit from 'p-limit';

import { httpClient, logger, type WebcamAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

export default async function scrapeCwuData(webcams: WithId<WebcamAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    webcams.map((webcam) =>
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
          let temp = 0;

          for (const p of parts) {
            switch (p.type) {
              case 'year':
                year = p.value.slice(2);
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
                temp = Number(p.value);
                temp = temp - (temp % 15);
                minute = temp.toString().padStart(2, '0');
                break;
            }
          }

          const response = await httpClient.get<ArrayBuffer>(
            `https://cwu.co.nz/temp/seeit-${webcam.externalId}-${day}-${month}-${year}-${hour}-${minute}.jpg`,
            { responseType: 'arraybuffer' }
          );

          const contentType = response.headers['content-type'];
          if (response.status === 200 && contentType === 'image/jpeg') {
            base64 = Buffer.from(response.data).toString('base64');
            updated = new Date();
          }

          await processScrapedData(webcam, updated, base64);
        } catch {
          logger.warn(`cwu error - ${webcam.externalId}`, {
            service: 'webcam',
            type: 'cwu'
          });
        }
      })
    )
  );
}
