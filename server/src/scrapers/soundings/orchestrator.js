import logger from '../../lib/logger.js';
import scrapeRaspData from './types/rasp.js';
import { Sounding } from '../../models/soundingModel.js';

export async function runScraper() {
  const query = { isDisabled: { $ne: true } };

  const soundings = await Sounding.find(query);
  if (!soundings.length) {
    logger.error('No soundings found.', {
      service: 'sounding'
    });
    return null;
  }

  try {
    logger.info(`----- Sounding: scraping ${soundings.length} soundings -----`, {
      service: 'sounding'
    });

    await scrapeRaspData(soundings);
    logger.info(`----- Soundings finished -----`, {
      service: 'sounding'
    });
  } catch (err) {
    logger.error(`Sounding scraper failed: ${err.message}`, {
      service: 'sounding'
    });
  }
}
