import { httpClient, logger, type WebcamAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

export default async function scrapeWebcamFtpData(webcams: WithId<WebcamAttrs>[]): Promise<void> {
  const webcam = webcams[0];
  if (!webcam) {
    return;
  }

  try {
    const response = await httpClient.get<ArrayBuffer>(
      'https://cameraftpapi.drivehq.com/api/Camera/GetCameraThumbnail.ashx?shareID=16834851',
      { responseType: 'arraybuffer' }
    );

    const lastModified = response.headers['last-modified'];
    const updated = lastModified ? new Date(lastModified) : new Date();

    // skip if image already up to date
    const lastUpdate = webcam.lastUpdate ? new Date(webcam.lastUpdate) : new Date(0);
    const base64 = updated > lastUpdate ? Buffer.from(response.data).toString('base64') : null;

    await processScrapedData(webcam, updated, base64);
  } catch {
    logger.warn('camftp error', {
      service: 'webcam',
      type: 'camftp'
    });
  }
}
