import cron from 'node-cron';
import { runScraper } from './orchestrator.js';
import logger from '../../lib/logger.js';
import { removeOldImages } from '../../services/camService.js';

logger.info('----- Initialising webcam scheduler -----', {
  service: 'cam'
});

// cams
cron.schedule('*/10 * * * *', async () => {
  logger.info('----- Starting webcam scraper -----', {
    service: 'cam'
  });
  let ts = Date.now();
  await runScraper();
  logger.info(
    `----- Webcam scraper finished, ${Math.round((Date.now() - ts) / 1000)}s elapsed -----`,
    {
      service: 'cam'
    }
  );
});

// cleanup
cron.schedule('5 0 * * *', async () => {
  logger.info('----- Remove old images start -----', { service: 'cleanup' });
  const ts = Date.now();
  await removeOldImages();
  logger.info(`----- Remove old images end - ${Date.now() - ts}ms elapsed. -----`, {
    service: 'cleanup'
  });
});
