import pLimit from 'p-limit';

import { httpClient, logger, type WebcamAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

function extractMetadata(html: string): Map<string, { url: string; updated: Date }> {
  const result = new Map<string, { url: string; updated: Date }>();
  const regex =
    /href="(https:\/\/canterburyglidingclub\.nz\/images\/CGCHdCam(\d)_1\.jpg\?v=(\d+))"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const [, url, id, epoch] = match;
    result.set(id, { url, updated: new Date(Number(epoch) * 1000) });
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
            updated = entry.updated;

            if (updated > new Date(webcam.lastUpdate)) {
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
