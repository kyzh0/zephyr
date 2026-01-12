import { FilterQuery } from 'mongoose';

import scrapers, { type StationScraperType, type StationScraper } from './index';
import logger from '@/lib/logger';
import { Station, type StationAttrs } from '@/models/stationModel';
import type { WithId } from '@/types/mongoose';

type GroupedStations = Record<StationScraperType | string, WithId<StationAttrs>[]>;

export async function runScraper(highResolution: boolean): Promise<void> {
  const query: FilterQuery<StationAttrs> = {
    isHighResolution: { $ne: true },
    isDisabled: { $ne: true }
  };

  if (highResolution) {
    query.isHighResolution = true;
  }

  const stations = await Station.find(query).lean<WithId<StationAttrs>[]>();
  if (!stations.length) {
    logger.error('No stations found.', { service: 'station' });
    return;
  }

  // group by type
  const grouped = stations.reduce<GroupedStations>((acc, s) => {
    (acc[s.type] ??= []).push(s);
    return acc;
  }, {});

  logger.info(`----- Station: scraping ${Object.keys(grouped).length} types -----`, {
    service: 'station'
  });

  // scrape concurrently per type
  const jobs = Object.entries(grouped).map(async ([type, stationsForType]) => {
    try {
      logger.info(`----- Station: scraping ${type}, ${stationsForType.length} stations -----`, {
        service: 'station',
        type
      });

      const scraper = (scrapers as Record<string, StationScraper | undefined>)[type];
      if (scraper) {
        await scraper(stationsForType);
        logger.info(`----- Station finished: ${type} -----`, { service: 'station', type });
      } else {
        logger.error(`Station scraper does not exist for: ${type}`, { service: 'station', type });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Station scraper ${type} failed: ${message}`, { service: 'station', type });
    }
  });

  await Promise.allSettled(jobs);
}

type StationWithLatestData = WithId<StationAttrs> & {
  data: Array<{ time: Date | string }>;
};

export async function rerunScraper(): Promise<void> {
  const allStations = await Station.aggregate<StationWithLatestData>([
    { $match: { isDisabled: { $ne: true }, isHighResolution: { $ne: true } } },
    {
      $lookup: {
        from: 'stationdatas',
        localField: '_id',
        foreignField: 'station',
        pipeline: [{ $sort: { time: -1 } }, { $limit: 1 }],
        as: 'data'
      }
    }
  ]);

  if (!allStations.length) {
    logger.error('No stations found.', { service: 'miss' });
    return;
  }

  const stations: StationWithLatestData[] = [];
  for (const s of allStations) {
    const last = s.data?.[0]?.time;
    const lastTs = last ? new Date(last).getTime() : NaN;

    if (!last || Number.isNaN(lastTs) || Date.now() - lastTs > 10 * 60 * 1000) {
      stations.push(s);
    }
  }

  if (!stations.length) {
    logger.info('Data is up to date.', { service: 'miss' });
    return;
  }

  // group by type
  const grouped = stations.reduce<Record<string, StationWithLatestData[]>>((acc, s) => {
    (acc[s.type] ??= []).push(s);
    return acc;
  }, {});

  logger.info(`----- Station: scraping ${Object.keys(grouped).length} types -----`, {
    service: 'miss'
  });

  // scrape concurrently per type
  const jobs = Object.entries(grouped).map(async ([type, stationsForType]) => {
    try {
      logger.info(`----- Station: scraping ${type}, ${stationsForType.length} stations -----`, {
        service: 'miss',
        type
      });

      const scraper = (scrapers as Record<string, StationScraper | undefined>)[type];
      if (scraper) {
        await scraper(stationsForType);
        logger.info(`----- Station finished: ${type} -----`, { service: 'miss', type });
      } else {
        logger.error(`Station scraper does not exist for: ${type}`, { service: 'miss', type });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Station scraper ${type} failed: ${msg}`, { service: 'miss', type });
    }
  });

  await Promise.allSettled(jobs);
}
