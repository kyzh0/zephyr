import scrapers, { type CamScraperType, type CamScraper } from './index';
import { logger, Cam, type WithId, type CamAttrs } from '@zephyr/shared';

type GroupedCams = Record<CamScraperType | string, WithId<CamAttrs>[]>;

export async function runScraper(): Promise<void> {
  const query = { isDisabled: { $ne: true } };

  const cams = await Cam.find(query).lean<WithId<CamAttrs>[]>();
  if (!cams.length) {
    logger.error('No webcams found.', { service: 'cam' });
    return;
  }

  // group by type
  const grouped = cams.reduce<GroupedCams>((acc, cam) => {
    (acc[cam.type] ??= []).push(cam);
    return acc;
  }, {});

  logger.info(`----- Webcam: scraping ${Object.keys(grouped).length} types -----`, {
    service: 'cam'
  });

  // scrape concurrently per type
  const jobs = Object.entries(grouped).map(async ([type, camsForType]) => {
    try {
      logger.info(`----- Webcam: scraping ${type}, ${camsForType.length} cams -----`, {
        service: 'cam',
        type
      });

      const scraper = (scrapers as Record<string, CamScraper | undefined>)[type];
      if (scraper) {
        await scraper(camsForType);
        logger.info(`----- Webcam finished: ${type} -----`, { service: 'cam', type });
      } else {
        logger.error(`Webcam scraper does not exist for: ${type}`, { service: 'cam', type });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Webcam scraper ${type} failed: ${msg}`, { service: 'cam', type });
    }
  });

  await Promise.allSettled(jobs);
}
