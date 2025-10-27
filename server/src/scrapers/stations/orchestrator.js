import scrapers from './index.js';
import logger from '../../lib/logger.js';
import { Station } from '../../models/stationModel.js';

export async function runScraper(highResolution) {
  const query = { isHighResolution: { $ne: true }, isDisabled: { $ne: true } };
  if (highResolution) {
    query.isHighResolution = true;
  }

  const stations = await Station.find(query);
  if (!stations.length) {
    logger.error('No stations found.', {
      service: 'station'
    });
    return;
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
    } catch (error) {
      logger.error(`Station scraper ${type} failed: ${error.message}`, {
        service: 'station',
        type: type
      });
    }
  });

  await Promise.allSettled(jobs);
}

export async function rerunScraper() {
  const allStations = await Station.find({
    isDisabled: { $ne: true },
    isHighResolution: { $ne: true }
  }).populate({
    path: 'data',
    options: { sort: { time: -1 }, limit: 1 }
  });

  if (!allStations.length) {
    logger.error('No stations found.', {
      service: 'miss'
    });
    return;
  }

  const stations = [];
  for (const s of allStations) {
    if (!s.data[0] || Date.now() - new Date(s.data[0].time).getTime() > 10 * 60 * 1000) {
      stations.push(s);
    }
  }

  if (!stations.length) {
    logger.info('Data is up to date.', {
      service: 'miss'
    });
    return;
  }

  // group by type
  const grouped = stations.reduce((acc, s) => {
    acc[s.type] ??= [];
    acc[s.type].push(s);
    return acc;
  }, {});

  logger.info(`----- Station: scraping ${Object.keys(grouped).length} types -----`, {
    service: 'miss'
  });

  // scrape concurrently per type
  const jobs = Object.entries(grouped).map(async ([type, stations]) => {
    try {
      logger.info(`----- Station: scraping ${type}, ${stations.length} stations -----`, {
        service: 'miss',
        type: type
      });

      const scraper = scrapers[type];
      if (scraper) {
        await scraper(stations);
        logger.info(`----- Station finished: ${type} -----`, {
          service: 'miss',
          type: type
        });
      } else {
        logger.error(`Station scraper does not exist for: ${type}`, {
          service: 'miss',
          type: type
        });
      }
    } catch (error) {
      logger.error(`Station scraper ${type} failed: ${error.message}`, {
        service: 'miss',
        type: type
      });
    }
  });

  await Promise.allSettled(jobs);
}
