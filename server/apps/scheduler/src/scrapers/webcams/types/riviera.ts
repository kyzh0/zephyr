import { httpClient, logger, type WebcamAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

export default async function scrapeRivieraData(webcams: WithId<WebcamAttrs>[]): Promise<void> {
  const webcam = webcams[0];
  if (!webcam) {
    return;
  }

  try {
    let updated: Date | null = null;
    let base64: string | null = null;

    const response = await httpClient.get<ArrayBuffer>(
      'https://cameraftpapi.drivehq.com/api/Camera/LastImageaspx/shareID18234109/AnyName.jpg',
      { responseType: 'arraybuffer' }
    );

    const lastModified = response.headers['last-modified'];
    updated = lastModified ? new Date(lastModified) : new Date();

    // skip if image already up to date
    if (updated > new Date(webcam.lastUpdate)) {
      base64 = Buffer.from(response.data).toString('base64');
    }

    await processScrapedData(webcam, updated, base64);
  } catch {
    logger.warn('riviera error', {
      service: 'webcam',
      type: 'riviera'
    });
  }
}
