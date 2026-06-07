import pLimit from 'p-limit';
import { fromZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';

import { httpClient, logger, type WebcamAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

function extractMetadata(html: string): Map<string, { url: string; timestamp: string }> {
  const result = new Map<string, { url: string; timestamp: string }>();
  const regex =
    /href="(https:\/\/canterburyglidingclub\.nz\/images\/CGCHdCam(\d)_1\.jpg[^"]*)"[\s\S]*?<strong>([^<]+)<\/strong>/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const [, url, id, timestamp] = match;
    result.set(id, { url, timestamp: timestamp.trim() });
  }
  return result;
}

export default async function scrapeCgcData(webcams: WithId<WebcamAttrs>[]): Promise<void> {
  let html: string;
  try {
    const { data } = await httpClient.get<string>('https://canterburyglidingclub.nz/weather-cam/');
    html = data;
  } catch {
    logger.warn('cgc error - failed to fetch page', { service: 'webcam', type: 'cgc' });
    return;
  }

  const metadata = extractMetadata(html);
  const limit = pLimit(5);

  await Promise.allSettled(
    webcams.map((webcam) =>
      limit(async () => {
        try {
          const entry = metadata.get(webcam.externalId ?? '');

          let updated: Date | null = null;
          let base64: string | null = null;

          if (entry) {
            updated = fromZonedTime(
              parse(entry.timestamp, 'HH:mm EEE dd-MMM-yyyy', new Date()),
              'Pacific/Auckland'
            );

            if (updated && updated > new Date(webcam.lastUpdate)) {
              const response = await httpClient.get<ArrayBuffer>(entry.url, {
                responseType: 'arraybuffer'
              });
              base64 = Buffer.from(response.data).toString('base64');
            }
          }

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
