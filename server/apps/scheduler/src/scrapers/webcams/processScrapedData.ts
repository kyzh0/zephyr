import sharp from 'sharp';
import md5 from 'md5';
import fs from 'node:fs/promises';

import { logger, Webcam, type WithId, type WebcamAttrs, type WebcamImage } from '@zephyr/shared';

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
  webcam: WithId<WebcamAttrs>,
  updated: Date | null,
  base64: string | null
): Promise<void> {
  try {
    if (!updated || !base64) {
      logger.info(
        `${webcam.type} image update skipped${webcam.externalId ? ` - ${webcam.externalId}` : ''}`,
        { service: 'webcam', type: webcam.type }
      );
      return;
    }

    const imgBuff = Buffer.from(base64, 'base64');

    const img: Partial<WebcamImage> & { time: Date } = {
      time: updated
    };

    // for types that don't have embedded timestamps, check for duplicate image
    if (NO_EMBEDDED_TIMESTAMP_TYPES.has(webcam.type)) {
      img.hash = md5(imgBuff);
      img.fileSize = imgBuff.length;

      if (webcam.images.length) {
        const latestImg = webcam.images.reduce((prev, current) =>
          prev && new Date(prev.time) > new Date(current.time) ? prev : current
        );

        if (latestImg && latestImg.fileSize === img.fileSize && latestImg.hash === img.hash) {
          logger.info(
            `${webcam.type} image update skipped${webcam.externalId ? ` - ${webcam.externalId}` : ''}`,
            { service: 'webcam', type: webcam.type }
          );
          return;
        }
      }
    }

    const dir = `public/webcams/${webcam.type}/${webcam._id.toString()}`;
    await fs.mkdir(dir, { recursive: true });

    const resizedBuf = await sharp(imgBuff).resize({ width: 600 }).toBuffer();
    const filePath = `${dir}/${updated.toISOString()}.jpg`;
    await fs.writeFile(filePath, resizedBuf);

    img.url = filePath.replace('public/', '');

    // add image + update webcam
    await Webcam.updateOne(
      { _id: webcam._id, __v: webcam.__v },
      {
        $push: { images: img },
        $set: {
          lastUpdate: new Date(),
          currentTime: updated,
          currentUrl: img.url
        },
        $inc: { __v: 1 }
      }
    );

    logger.info(
      `${webcam.type} image updated${webcam.externalId ? ` - ${webcam.externalId}` : ''}`,
      {
        service: 'webcam',
        type: webcam.type
      }
    );
  } catch (error) {
    logger.error(
      `An error occured while saving image for ${webcam.type}${webcam.externalId ? ` - ${webcam.externalId}` : ''}`,
      { service: 'webcam', type: webcam.type }
    );

    const msg = error instanceof Error ? error.message : String(error);
    logger.error(msg, { service: 'webcam', type: webcam.type });
  }
}
