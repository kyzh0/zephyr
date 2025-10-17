import scrapers from './index.js';
import logger from '../../lib/logger.js';
import { Station } from '../../models/stationModel.js';

export async function runScraper(highResolution) {
  const query = { isHighResolution: { $ne: true }, isDisabled: { $ne: true } };
  if (highResolution) query.isHighResolution = true;

  const stations = await Station.find(query, { data: 0 });
  if (!stations.length) {
    logger.error('No stations found.', {
      service: 'station'
    });
    return null;
  }

  // group by type
  const grouped = stations.reduce((acc, s) => {
    acc[s.type] ??= [];
    acc[s.type].push(s);
    return acc;
  }, {});

  logger.info(`----- Station: scraping ${Object.keys(grouped).length} types -----`, {
    service: 'station'
  });

  // scrape concurrently per type
  const jobs = Object.entries(grouped).map(async ([type, stations]) => {
    try {
      logger.info(`----- Station: scraping ${type}, ${stations.length} stations -----`, {
        service: 'station',
        type: type
      });

      const scraper = scrapers[type];
      if (scraper) {
        await scraper(stations);
        logger.info(`----- Station finished: ${type} -----`, {
          service: 'station',
          type: type
        });
      } else {
        logger.error(`Station scraper does not exist for: ${type}`, {
          service: 'station',
          type: type
        });
      }
    } catch (err) {
      logger.error(`Station scraper ${type} failed: ${err.message}`, {
        service: 'station',
        type: type
      });
    }
  });

  await Promise.allSettled(jobs);
}
