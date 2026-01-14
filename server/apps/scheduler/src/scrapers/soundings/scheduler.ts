import cron from 'node-cron';

import { runScraper } from './orchestrator';
import { logger } from '@zephyr/shared';
import { removeOldSoundings } from '@/services/soundingService';

export async function startSoundingScheduler(): Promise<void> {
  logger.info('----- Initialising sounding scheduler -----', {
    service: 'sounding'
  });

  // soundings - at 08:00 NZT
  cron.schedule(
    '0 8 * * *',
    async () => {
      logger.info('----- Remove old soundings start -----', { service: 'sounding' });
      await removeOldSoundings();
      logger.info('----- Remove old soundings end -----', { service: 'sounding' });

      logger.info('----- Update soundings start -----', { service: 'sounding' });
      const ts = Date.now();
      await runScraper();
      logger.info(
        `----- Update soundings end - ${Math.floor((Date.now() - ts) / 1000)}s elapsed. -----`,
        { service: 'sounding' }
      );
    },
    { timezone: 'Pacific/Auckland' }
  );
}
