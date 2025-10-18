import pLimit from 'p-limit';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeWanakaAirportData(cams) {
  const limit = pLimit(5);

  await Promise.allSettled(
    cams.map((cam) =>
      limit(async () => {
        try {
          let updated = null;
          let base64 = null;

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

          const response = await httpClient.get(
            `https://www.wanakaairport.com/WebCam/${cam.externalId}.jpg?dt=${year}-${month}-${day}-${hour}-${minute}`,
            {
              responseType: 'arraybuffer'
            }
          );
          if (response.status == 200 && response.headers['content-type'] === 'image/jpeg') {
            base64 = Buffer.from(response.data, 'binary').toString('base64');
            updated = new Date();
          }

          await processScrapedData(cam, updated, base64);
        } catch (error) {
          logger.warn(`wanaka airport error - ${cam.externalId}`, {
            service: 'cam',
            type: 'wa'
          });
        }
      })
    )
  );
}
