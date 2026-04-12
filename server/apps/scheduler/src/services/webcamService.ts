import fs from 'node:fs/promises';
import dir from 'node-dir';

import { logger, Webcam, type WebcamAttrs, type WithId } from '@zephyr/shared';

export async function removeOldImages(): Promise<void> {
  try {
    const webcams = await Webcam.find().lean<WithId<WebcamAttrs>[]>();
    if (!webcams.length) {
      logger.error('No webcams found.', { service: 'cleanup' });
      return;
    }

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const webcam of webcams) {
      await Webcam.updateOne(
        { _id: webcam._id, __v: webcam.__v },
        {
          $pull: { images: { time: { $lte: cutoff } } },
          $inc: { __v: 1 }
        }
      );
    }

    await new Promise<void>((resolve, reject) => {
      dir.files('public/webcams', async (error: unknown, files: string[]) => {
        if (error) {
          reject(error);
          return;
        }

        try {
          for (const file of files) {
            const stats = await fs.stat(file);
            if (stats.birthtimeMs <= cutoff.getTime()) {
              await fs.rm(file);
            }
          }
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  } catch {
    logger.error('An error occured while removing old images', { service: 'cleanup' });
  }
}
