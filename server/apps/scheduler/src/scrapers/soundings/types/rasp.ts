import path from 'node:path';
import pLimit from 'p-limit';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import { fromZonedTime } from 'date-fns-tz';

import { httpClient, logger, Sounding, type WithId, type SoundingAttrs } from '@zephyr/shared';

const PUBLIC_DIR = process.env.PUBLIC_DIR ?? 'public';

export default async function scrapeRaspData(soundings: WithId<SoundingAttrs>[]): Promise<void> {
  const limit = pLimit(5);

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

        const images = [];
        for (let i = 9; i < 20; i++) {
          const hr = i.toString().padStart(2, '0');

          let response;
          try {
            response = await httpClient.get<ArrayBuffer>(
              `http://rasp.nz/rasp/regions/${sounding.raspRegion}+0/${year}/${year}${month}${day}/sounding${sounding.raspId}.curr.${hr}00lst.w2.png`,
              { responseType: 'arraybuffer' }
            );
          } catch {
            try {
              response = await httpClient.get<ArrayBuffer>(
                `http://rasp.nz/rasp/regions/${sounding.raspRegion}/${year}/${year}${month}${day}/sounding${sounding.raspId}.curr.${hr}00lst.w2.png`,
                { responseType: 'arraybuffer' }
              );
            } catch {
              logger.warn(
                `rasp soundings error - ${sounding.raspRegion} - ${sounding.raspId} - ${hr}`,
                { service: 'sounding' }
              );
              continue;
            }
          }

          const imgBuff = Buffer.from(response.data);
          const resizedBuf = await sharp(imgBuff).resize({ width: 600 }).toBuffer();

          const timeStr = `${year}-${month}-${day}T${hr}:00:00`;
          const soundingDir = path.join(
            PUBLIC_DIR,
            'soundings',
            sounding.raspRegion,
            sounding.raspId
          );
          const filePath = path.join(soundingDir, `${timeStr}.png`);

          await fs.mkdir(soundingDir, { recursive: true });

          await fs.writeFile(filePath, resizedBuf);

          const img = {
            time: fromZonedTime(timeStr, 'Pacific/Auckland'),
            url: path.relative(PUBLIC_DIR, filePath)
          };
          images.push(img);
        }

        if (images.length) {
          await Sounding.updateOne(
            { _id: sounding._id, __v: sounding.__v },
            {
              $push: { images: { $each: images } },
              $inc: { __v: 1 }
            }
          );

          logger.info(`rasp sounding updated - ${sounding.raspRegion} - ${sounding.raspId}`, {
            service: 'sounding'
          });
        }
      })
    )
  );
}
