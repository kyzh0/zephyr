import fs from 'node:fs/promises';
import dir from 'node-dir';

import { logger, Cam, type CamAttrs, type WithId } from '@zephyr/shared';

export async function removeOldImages(): Promise<void> {
  try {
    const cams = await Cam.find().lean<WithId<CamAttrs>[]>();
    if (!cams.length) {
      logger.error('No cams found.', { service: 'cleanup' });
      return;
    }

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const c of cams) {
      await Cam.updateOne(
        { _id: c._id, __v: c.__v },
        {
          $pull: { images: { time: { $lte: cutoff } } },
          $inc: { __v: 1 }
        }
      );
    }

    // node-dir is callback-based: wrap in a Promise so errors are caught by try/catch
    await new Promise<void>((resolve, reject) => {
      dir.files('public/cams', async (error: unknown, files: string[]) => {
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
