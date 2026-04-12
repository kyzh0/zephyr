import cron from 'node-cron';

import { runScraper } from './orchestrator';
import { logger } from '@zephyr/shared';
import { removeOldImages } from '@/services/webcamService';

export async function startWebcamScheduler(): Promise<void> {
  logger.info('----- Initialising webcam scheduler -----', {
    service: 'webcam'
  });

  // webcams
  cron.schedule(
    '*/10 * * * *',
    async () => {
      logger.info('----- Starting webcam scraper -----', {
        service: 'webcam'
      });

      const ts = Date.now();
      await runScraper();

      logger.info(
        `----- Webcam scraper finished, ${Math.floor((Date.now() - ts) / 1000)}s elapsed -----`,
        { service: 'webcam' }
      );
    },
    { noOverlap: true }
  );

  // cleanup
  cron.schedule('5 0 * * *', async () => {
    logger.info('----- Remove old images start -----', { service: 'cleanup' });

    const ts = Date.now();
    await removeOldImages();

    logger.info(`----- Remove old images end - ${Date.now() - ts}ms elapsed. -----`, {
      service: 'cleanup'
    });
  });
}
