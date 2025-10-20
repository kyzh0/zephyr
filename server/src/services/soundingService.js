import fs from 'fs/promises';
import logger from '../lib/logger.js';
import { Sounding } from '../models/soundingModel.js';

export async function removeOldSoundings() {
  try {
    const soundings = await Sounding.find({});
    if (!soundings.length) {
      logger.error('No soundings found.', { service: 'sounding' });
      return;
    }

    for (const s of soundings) {
      // remove old images
      await Sounding.updateOne({ _id: s._id }, { $set: { images: [] } });
      const directory = `public/soundings/${s.raspRegion}/${s.raspId}`;
      await fs.rm(directory, { recursive: true, force: true });
      await fs.mkdir(directory, { recursive: true });
    }
  } catch (error) {
    logger.error('An error occured while removing old soundings', { service: 'sounding' });
    logger.error(error);
  }
}
