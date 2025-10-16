import cron from 'node-cron';
import { runScraper } from './orchestrator.js';
import logger from '../../lib/logger.js';
import {
  processHighResolutionStationJson,
  processStationJson
} from '../../services/processStationJson.js';

logger.info('----- Initialising station scheduler -----', {
  service: 'station'
});

// stations
cron.schedule('*/10 * * * *', async () => {
  logger.info('----- Starting station scraper -----', {
    service: 'station'
  });
  let ts = Date.now();
  await runScraper();
  logger.info(
    `----- Station scraper finished, ${Math.round((Date.now() - ts) / 1000)}s elapsed -----`,
    {
      service: 'station'
    }
  );

  logger.info('--- Process json output start ---', { service: 'json' });
  ts = Date.now();
  await processStationJson();
  logger.info(`--- Process json output end - ${Date.now() - ts}ms elapsed.`, {
    service: 'json'
  });
});

// hi res stations
cron.schedule('*/2 * * * *', async () => {
  logger.info('----- Starting high resolution station scraper -----', {
    service: 'station'
  });
  let ts = Date.now();
  await runScraper(true);
  logger.info(
    `----- High resolution station scraper finished, ${Math.round((Date.now() - ts) / 1000)}s elapsed -----`,
    {
      service: 'station'
    }
  );

  logger.info('--- Process high resolution json output start ---', { service: 'json' });
  ts = Date.now();
  await processHighResolutionStationJson();
  logger.info(`--- Process high resolution json output end - ${Date.now() - ts}ms elapsed.`, {
    service: 'json'
  });
});
