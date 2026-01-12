import logger from '@/lib/logger';
import scrapeRaspData from './types/rasp';
import { Sounding } from '@/models/soundingModel';

export async function runScraper(): Promise<void> {
  const query = { isDisabled: { $ne: true } };

  const soundings = await Sounding.find(query);
  if (!soundings.length) {
    logger.error('No soundings found.', { service: 'sounding' });
    return;
  }

  try {
    logger.info(`----- Sounding: scraping ${soundings.length} soundings -----`, {
      service: 'sounding'
    });

    await scrapeRaspData(soundings);

    logger.info('----- Soundings finished -----', {
      service: 'sounding'
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Sounding scraper failed: ${msg}`, {
      service: 'sounding'
    });
  }
}
