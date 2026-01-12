import cron from 'node-cron';
import { runScraper } from './orchestrator.js';
import logger from '../../lib/logger.js';
import { removeOldSoundings } from '../../services/soundingService.js';

export async function startSoundingScheduler() {
  logger.info('----- Initialising sounding scheduler -----', {
    service: 'sounding'
  });

  // soundings - at 0730 NZT
  cron.schedule(
    '30 7 * * *',
    async () => {
      logger.info('----- Remove old soundings start -----', { service: 'sounding' });
      await removeOldSoundings();
      logger.info('----- Remove old soundings end -----', { service: 'sounding' });

      logger.info('----- Update soundings start -----', { service: 'sounding' });
      const ts = Date.now();
      await runScraper();
      logger.info(
        `----- Update soundings end - ${Math.floor((Date.now() - ts) / 1000)}s elapsed. -----`,
        {
          service: 'sounding'
        }
      );
    },
    { timezone: 'Pacific/Auckland' }
  );
}
