import cron from 'node-cron';
import { runScraper } from './orchestrator.js';
import logger from '../../lib/logger.js';

logger.info('----- Starting station scheduler -----', {
  service: 'station'
});

// stations
cron.schedule('*/10 * * * *', async () => {
  logger.info('----- Starting station scraper -----', {
    service: 'station'
  });
  const time = Date.now();
  await runScraper();
  logger.info(
    `----- Station scraper finished, ${Math.round((Date.now() - time) / 1000)}s elapsed -----`,
    {
      service: 'station'
    }
  );
});

// hi res stations
cron.schedule('*/2 * * * *', async () => {
  logger.info('----- Starting high resolution station scraper -----', {
    service: 'station'
  });
  const time = Date.now();
  await runScraper(true);
  logger.info(
    `----- High resolution station scraper finished, ${Math.round((Date.now() - time) / 1000)}s elapsed -----`,
    {
      service: 'station'
    }
  );
});
