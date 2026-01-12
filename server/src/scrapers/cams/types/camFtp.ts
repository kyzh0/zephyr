import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/cams/processScrapedData';
import logger from '@/lib/logger';

import type { CamDoc } from '@/models/camModel';

export default async function scrapeCamFtpData(cams: CamDoc[]): Promise<void> {
  const cam = cams[0];
  if (!cam) return;

  try {
    const response = await httpClient.get<ArrayBuffer>(
      'https://cameraftpapi.drivehq.com/api/Camera/GetCameraThumbnail.ashx?shareID=16834851',
      { responseType: 'arraybuffer' }
    );

    const lastModified = response.headers['last-modified'];
    const updated = lastModified ? new Date(lastModified) : new Date();

    // skip if image already up to date
    const lastUpdate = cam.lastUpdate ? new Date(cam.lastUpdate) : new Date(0);
    const base64 = updated > lastUpdate ? Buffer.from(response.data).toString('base64') : null;

    await processScrapedData(cam, updated, base64);
  } catch {
    logger.warn('camftp error', {
      service: 'cam',
      type: 'camftp'
    });
  }
}
