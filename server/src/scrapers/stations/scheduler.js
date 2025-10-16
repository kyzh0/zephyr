import cron from 'node-cron';
import { runScraper } from './orchestrator.js';
import logger from '../../lib/logger.js';

logger.info('----- Starting station scheduler -----');

// stations
cron.schedule('*/10 * * * *', async () => {
  await runScraper();
});

// hi res stations
cron.schedule('*/2 * * * *', async () => {
  await runScraper(true);
});
