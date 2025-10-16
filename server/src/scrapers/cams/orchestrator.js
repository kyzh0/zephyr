import scrapers from './index.js';
import logger from '../../lib/logger.js';
import { Cam } from '../../models/camModel.js';

export async function runScraper() {
  const query = { isDisabled: { $ne: true } };

  const cams = await Cam.find(query);
  if (!cams.length) {
    logger.error('No webcams found.', {
      service: 'cam'
    });
    return null;
  }

  // group by type
  const grouped = cams.reduce((acc, s) => {
    acc[s.type] ??= [];
    acc[s.type].push(s);
    return acc;
  }, {});

  logger.info(`----- Scraping ${Object.keys(grouped).length} webcam types -----`, {
    service: 'cam'
  });

  // scrape concurrently per type
  const jobs = Object.entries(grouped).map(async ([type, cams]) => {
    try {
      logger.info(`----- Scraping: ${type}, ${cams.length} webcams -----`, {
        service: 'cam',
        type: type
      });

      const scraper = scrapers[type];
      if (scraper) {
        await scraper(cams);
        logger.info(`----- Finished: ${type} -----`, {
          service: 'cam',
          type: type
        });
      } else {
        logger.error(`Scraper does not exist for: ${type}`, {
          service: 'cam',
          type: type
        });
      }
    } catch (err) {
      logger.error(`${type} scraper failed: ${err.message}`, {
        service: 'cam',
        type: type
      });
    }
  });

  await Promise.allSettled(jobs);
}
