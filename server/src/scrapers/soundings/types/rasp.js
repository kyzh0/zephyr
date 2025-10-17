import pLimit from 'p-limit';
import sharp from 'sharp';
import fs from 'fs/promises';
import { fromZonedTime } from 'date-fns-tz';
import httpClient from '../../../lib/httpClient.js';
import logger from '../../../lib/logger.js';
import { Sounding } from '../../../models/soundingModel.js';

export default async function scrapeRaspData(soundings) {
  const limit = pLimit(10);

  await Promise.allSettled(
    soundings.map((sounding) =>
      limit(async () => {
        const dateTimeFormat = new Intl.DateTimeFormat('en-NZ', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          timeZone: 'Pacific/Auckland'
        });
        const parts = dateTimeFormat.formatToParts(new Date());

        let year = '';
        let month = '';
        let day = '';
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
          }
        }

        for (let i = 9; i < 20; i++) {
          const hr = i.toString().padStart(2, '0');

          try {
            const response = await httpClient.get(
              `http://rasp.nz/rasp/regions/${sounding.raspRegion}+0/${year}/${year}${month}${day}/sounding${sounding.raspId}.curr.${hr}00lst.w2.png`,
              {
                responseType: 'arraybuffer',
                headers: {
                  Connection: 'keep-alive'
                }
              }
            );
            const base64 = Buffer.from(response.data, 'binary').toString('base64');
            const imgBuff = Buffer.from(base64, 'base64');
            const resizedBuf = await sharp(imgBuff).resize({ width: 600 }).toBuffer();

            const timeStr = `${year}-${month}-${day}T${hr}:00:00`;
            const path = `public/soundings/${sounding.raspRegion}/${sounding.raspId}/${timeStr}.png`;
            await fs.writeFile(path, resizedBuf);

            const img = {
              time: fromZonedTime(timeStr, 'Pacific/Auckland'),
              url: path.replace('public/', '')
            };

            // add image
            await Sounding.updateOne(
              { _id: sounding._id },
              {
                $push: {
                  images: img
                }
              }
            );

            logger.info(
              `rasp sounding updated - ${sounding.raspRegion} - ${sounding.raspId} - ${hr}`,
              {
                service: 'sounding'
              }
            );
          } catch (error) {
            logger.warn(
              `rasp soundings error - ${sounding.raspRegion} - ${sounding.raspId} - ${hr}`,
              {
                service: 'sounding'
              }
            );
          }
        }
      })
    )
  );
}
