import fs from 'fs/promises';
import dir from 'node-dir';

import logger from '../lib/logger.js';
import { Cam } from '../models/camModel.js';

export async function removeOldImages() {
  try {
    const cams = await Cam.find().lean();
    if (!cams.length) {
      logger.error(`No cams found.`, { service: 'cleanup' });
      return;
    }

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    for (const c of cams) {
      await Cam.updateOne({ _id: c._id }, { $pull: { images: { time: { $lte: cutoff } } } });
    }

    dir.files('public/cams', async (err, files) => {
      if (err) {
        throw err;
      }
      for (const file of files) {
        const stats = await fs.stat(file);
        if (stats.birthtimeMs <= cutoff.getTime()) {
          await fs.rm(file);
        }
      }
    });
  } catch (error) {
    logger.error('An error occured while removing old images', { service: 'cleanup' });
    return;
  }
}
