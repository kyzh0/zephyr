import pLimit from 'p-limit';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeMtHuttData(cams) {
  const limit = pLimit(5);

  await Promise.allSettled(
    cams.map((cam) =>
      limit(async () => {
        try {
          let updated = null;
          let base64 = null;

          const { data } = await httpClient.get('https://www.mthutt.co.nz/weather-report/');
          if (data.length) {
            let startStr = `/Webcams/MtHutt/SummitCamera/${cam.externalId}/`;
            let i = data.lastIndexOf(startStr);
            if (i >= 0) {
              const j = data.indexOf('.jpg', i);
              if (j > i) {
                const response = await httpClient.get(
                  `https://www.mthutt.co.nz${data.slice(i, j).trim()}.jpg`,
                  {
                    responseType: 'arraybuffer'
                  }
                );
                base64 = Buffer.from(response.data, 'binary').toString('base64');
                updated = new Date();
              }
            }
          }

          await processScrapedData(cam, updated, base64);
        } catch (error) {
          logger.warn(`mt hutt error - ${cam.externalId}`, {
            service: 'cam',
            type: 'hutt'
          });
        }
      })
    )
  );
}
