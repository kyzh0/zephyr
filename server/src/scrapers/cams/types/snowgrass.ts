import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/cams/processScrapedData';
import logger from '@/lib/logger';

import type { CamDoc } from '@/models/camModel';

export default async function scrapeSnowgrassData(cams: CamDoc[]): Promise<void> {
  const cam = cams[0];
  if (!cam) return;

  try {
    let updated: Date | null = null;
    let base64: string | null = null;

    const response = await httpClient.get<ArrayBuffer>(
      'https://snowgrass.nz/cust/contact/clyde/images/webcam.jpg',
      { responseType: 'arraybuffer' }
    );

    const lastModified = response.headers['last-modified'];
    updated = lastModified ? new Date(lastModified) : new Date();

    // skip if image already up to date
    if (updated > new Date(cam.lastUpdate)) {
      base64 = Buffer.from(response.data).toString('base64');
    }

    await processScrapedData(cam, updated, base64);
  } catch {
    logger.warn('snowgrass error', {
      service: 'cam',
      type: 'snowgrass'
    });
  }
}
