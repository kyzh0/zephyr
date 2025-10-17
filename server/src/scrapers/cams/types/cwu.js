import pLimit from 'p-limit';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeCwuData(cams) {
  const limit = pLimit(10);

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

          const response = await httpClient.get(
            `https://cwu.co.nz/temp/seeit-${cam.externalId}-${day}-${month}-${year}-${hour}-${minute}.jpg`,
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
          logger.warn(`cwu error - ${cam.externalId}`, {
            service: 'cam',
            type: 'cwu'
          });
        }
      })
    )
  );
}
