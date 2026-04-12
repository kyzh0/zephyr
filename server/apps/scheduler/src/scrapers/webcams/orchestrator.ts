import scrapers, { type WebcamScraperType, type WebcamScraper } from './index';
import { logger, Webcam, type WithId, type WebcamAttrs } from '@zephyr/shared';

type GroupedWebcams = Record<WebcamScraperType | string, WithId<WebcamAttrs>[]>;

export async function runScraper(): Promise<void> {
  const query = { isDisabled: { $ne: true } };

  const webcams = await Webcam.find(query).lean<WithId<WebcamAttrs>[]>();
  if (!webcams.length) {
    logger.error('No webcams found.', { service: 'webcam' });
    return;
  }

  // group by type
  const grouped = webcams.reduce<GroupedWebcams>((acc, webcam) => {
    (acc[webcam.type] ??= []).push(webcam);
    return acc;
  }, {});

  logger.info(`----- Webcam: scraping ${Object.keys(grouped).length} types -----`, {
    service: 'webcam'
  });

  // scrape concurrently per type
  const jobs = Object.entries(grouped).map(async ([type, webcamsForType]) => {
    try {
      logger.info(`----- Webcam: scraping ${type}, ${webcamsForType.length} webcams -----`, {
        service: 'webcam',
        type
      });

      const scraper = (scrapers as Record<string, WebcamScraper | undefined>)[type];
      if (scraper) {
        await scraper(webcamsForType);
        logger.info(`----- Webcam finished: ${type} -----`, { service: 'webcam', type });
      } else {
        logger.error(`Webcam scraper does not exist for: ${type}`, { service: 'webcam', type });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Webcam scraper ${type} failed: ${msg}`, { service: 'webcam', type });
    }
  });

  await Promise.allSettled(jobs);
}
