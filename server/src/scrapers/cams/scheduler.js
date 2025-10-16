import cron from 'node-cron';
import { runScraper } from './orchestrator.js';
import logger from '../../lib/logger.js';

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
