import pLimit from 'p-limit';
import { fromZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeCheesemanData(cams) {
  const limit = pLimit(10);

  await Promise.allSettled(
    cams.map((cam) =>
      limit(async () => {
        try {
          let updated = null;
          let base64 = null;

          const { data } = await httpClient.get(
            `https://www.mtcheeseman.co.nz/wp-content/webcam-player/?cam=${cam.externalId}`,
            {
              headers: {
                Connection: 'keep-alive'
              }
            }
          );
          if (data.length) {
            const matches = data.match(
              /\/wp-content\/webcam\/aframe\/\d{4}-\d{2}-\d{2}\/\d{12}\.jpg/g
            );
            if (matches && matches.length) {
              const url = matches[matches.length - 1];
              const match = url.match(/\d{12}/g);
              updated = fromZonedTime(
                parse(match[0], 'yyyyMMddHHmm', new Date()),
                'Pacific/Auckland'
              );

              // skip if image already up to date
              if (updated > new Date(cam.lastUpdate)) {
                const response = await httpClient.get(`https://www.mtcheeseman.co.nz${url}`, {
                  responseType: 'arraybuffer',
                  headers: {
                    Connection: 'keep-alive'
                  }
                });
                base64 = Buffer.from(response.data, 'binary').toString('base64');
              }
            }
          }

          await processScrapedData(cam, updated, base64);
        } catch (error) {
          logger.warn(`An error occured while fetching data for cheeseman - ${cam.externalId}`, {
            service: 'cam',
            type: 'cm'
          });
        }
      })
    )
  );
}
