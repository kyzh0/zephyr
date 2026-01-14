import sharp from 'sharp';
import md5 from 'md5';
import fs from 'node:fs/promises';

import { logger, Cam, type WithId, type CamAttrs, type CamImage } from '@zephyr/shared';

const NO_EMBEDDED_TIMESTAMP_TYPES = new Set<string>([
  'qa',
  'wa',
  'cgc',
  'ch',
  'cwu',
  'ap',
  'hutt',
  'ts',
  'snowgrass'
]);

export default async function processScrapedData(
  cam: WithId<CamAttrs>,
  updated: Date | null,
  base64: string | null
): Promise<void> {
  try {
    if (!updated || !base64) {
      logger.info(
        `${cam.type} image update skipped${cam.externalId ? ` - ${cam.externalId}` : ''}`,
        { service: 'cam', type: cam.type }
      );
      return;
    }

    const imgBuff = Buffer.from(base64, 'base64');

    const img: Partial<CamImage> & { time: Date } = {
      time: updated
    };

    // for types that don't have embedded timestamps, check for duplicate image
    if (NO_EMBEDDED_TIMESTAMP_TYPES.has(cam.type)) {
      img.hash = md5(imgBuff);
      img.fileSize = imgBuff.length;

      if (cam.images.length) {
        const latestImg = cam.images.reduce((prev, current) =>
          prev && new Date(prev.time) > new Date(current.time) ? prev : current
        );

        if (latestImg && latestImg.fileSize === img.fileSize && latestImg.hash === img.hash) {
          logger.info(
            `${cam.type} image update skipped${cam.externalId ? ` - ${cam.externalId}` : ''}`,
            { service: 'cam', type: cam.type }
          );
          return;
        }
      }
    }

    const dir = `public/cams/${cam.type}/${cam._id.toString()}`;
    await fs.mkdir(dir, { recursive: true });

    const resizedBuf = await sharp(imgBuff).resize({ width: 600 }).toBuffer();
    const filePath = `${dir}/${updated.toISOString()}.jpg`;
    await fs.writeFile(filePath, resizedBuf);

    img.url = filePath.replace('public/', '');

    // update cam (current state)
    await Cam.updateOne(
      { _id: cam._id },
      {
        lastUpdate: new Date(),
        currentTime: updated,
        currentUrl: img.url
      }
    );

    // add image (append to array)
    await Cam.updateOne({ _id: cam._id }, { $push: { images: img } });

    logger.info(`${cam.type} image updated${cam.externalId ? ` - ${cam.externalId}` : ''}`, {
      service: 'cam',
      type: cam.type
    });
  } catch (error) {
    logger.error(
      `An error occured while saving image for ${cam.type}${cam.externalId ? ` - ${cam.externalId}` : ''}`,
      { service: 'cam', type: cam.type }
    );

    const msg = error instanceof Error ? error.message : String(error);
    logger.error(msg, { service: 'cam', type: cam.type });
  }
}
