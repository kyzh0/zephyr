import pLimit from 'p-limit';

import { httpClient, logger, type WebcamAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

export default async function scrapeMtHuttData(webcams: WithId<WebcamAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    webcams.map((webcam) =>
      limit(async () => {
        try {
          let updated: Date | null = null;
          let base64: string | null = null;

          const { data } = await httpClient.get<string>('https://www.mthutt.co.nz/weather-report/');
          if (data.length) {
            const startStr = `/Webcams/MtHutt/SummitCamera/${webcam.externalId}/`;
            const i = data.lastIndexOf(startStr);

            if (i >= 0) {
              const j = data.indexOf('.jpg', i);
              if (j > i) {
                const imgPath = `${data.slice(i, j).trim()}.jpg`;

                const response = await httpClient.get<ArrayBuffer>(
                  `https://www.mthutt.co.nz${imgPath}`,
                  { responseType: 'arraybuffer' }
                );

                base64 = Buffer.from(response.data).toString('base64');
                updated = new Date();
              }
            }
          }

          await processScrapedData(webcam, updated, base64);
        } catch {
          logger.warn(`mt hutt error - ${webcam.externalId}`, {
            service: 'webcam',
            type: 'hutt'
          });
        }
      })
    )
  );
}
