import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeCamFtpData(cams) {
  const cam = cams[0];

  try {
    let updated = null;
    let base64 = null;

    const response = await httpClient.get(
      'https://cameraftpapi.drivehq.com/api/Camera/GetCameraThumbnail.ashx?shareID=16834851',
      {
        responseType: 'arraybuffer'
      }
    );

    updated = new Date(response.headers['last-modified']);
    // skip if image already up to date
    if (updated > new Date(cam.lastUpdate))
      base64 = Buffer.from(response.data, 'binary').toString('base64');

    processScrapedData(cam, updated, base64);
  } catch (error) {
    logger.warn('An error occured while fetching images for cam ftp', {
      service: 'cam',
      type: 'camftp'
    });
  }
}
