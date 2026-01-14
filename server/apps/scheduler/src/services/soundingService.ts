import fs from 'node:fs/promises';
import { logger, Sounding, type SoundingAttrs, type WithId } from '@zephyr/shared';

export async function removeOldSoundings(): Promise<void> {
  try {
    const soundings = await Sounding.find().lean<WithId<SoundingAttrs>[]>();
    if (!soundings.length) {
      logger.error('No soundings found.', { service: 'sounding' });
      return;
    }

    for (const s of soundings) {
      // remove old images (DB)
      await Sounding.updateOne({ _id: s._id }, { $set: { images: [] } });

      // remove + recreate directory
      const directory = `public/soundings/${s.raspRegion}/${s.raspId}`;
      await fs.rm(directory, { recursive: true, force: true });
      await fs.mkdir(directory, { recursive: true });
    }
  } catch (error) {
    logger.error('An error occured while removing old soundings', { service: 'sounding' });

    const msg = error instanceof Error ? error.message : String(error);
    logger.error(msg, { service: 'sounding' });
  }
}
