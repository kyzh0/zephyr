import sharp from 'sharp';
import md5 from 'md5';
import fs from 'fs/promises';
import logger from '../../lib/logger.js';

import { Cam } from '../../models/camModel.js';

export default async function processScrapedData(cam, updated, base64) {
  try {
    if (updated && base64) {
      const imgBuff = Buffer.from(base64, 'base64');

      const img = {
        time: updated
      };

      // for types that don't have embedded timestamps, check for duplicate image
      if (
        cam.type === 'qa' ||
        cam.type === 'wa' ||
        cam.type === 'cgc' ||
        cam.type === 'ch' ||
        cam.type === 'cwu' ||
        cam.type === 'ap' ||
        cam.type === 'hutt' ||
        cam.type === 'ts' ||
        cam.type === 'snowgrass'
      ) {
        img.hash = md5(imgBuff);
        img.fileSize = imgBuff.length;

        if (cam.images.length) {
          const latestImg = cam.images.reduce((prev, current) =>
            prev && new Date(prev.time) > new Date(current.time) ? prev : current
          );
          if (latestImg && latestImg.fileSize == img.fileSize && latestImg.hash == img.hash) {
            logger.info(
              `${cam.type} image update skipped${cam.externalId ? ` - ${cam.externalId}` : ''}`,
              { service: 'cam', type: cam.type }
            );
            return;
          }
        }
      }

      const dir = `public/cams/${cam.type}/${cam._id}`;
      await fs.mkdir(dir, { recursive: true });

      const resizedBuf = await sharp(imgBuff).resize({ width: 600 }).toBuffer();
      const path = `${dir}/${updated.toISOString()}.jpg`;
      await fs.writeFile(path, resizedBuf);

      img.url = path.replace('public/', '');

      // update cam
      cam.lastUpdate = new Date();
      cam.currentTime = updated;
      cam.currentUrl = img.url;
      await cam.save();

      // add image
      await Cam.updateOne(
        { _id: cam._id },
        {
          $push: {
            images: img
          }
        }
      );

      logger.info(`${cam.type} image updated${cam.externalId ? ` - ${cam.externalId}` : ''}`, {
        service: 'cam',
        type: cam.type
      });
    } else {
      logger.info(
        `${cam.type} image update skipped${cam.externalId ? ` - ${cam.externalId}` : ''}`,
        {
          service: 'cam',
          type: cam.type
        }
      );
    }
  } catch (error) {
    logger.error(
      `An error occured while saving image for ${cam.type}${cam.externalId ? ` - ${cam.externalId}` : ''}`,
      { service: 'cam', type: cam.type }
    );
    logger.error(error);
  }
}
