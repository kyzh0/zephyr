import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeSnowgrassData(cams) {
  const cam = cams[0];

  try {
    let updated = null;
    let base64 = null;

    const response = await httpClient.get(
      'https://snowgrass.nz/cust/contact/clyde/images/webcam.jpg',
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
    logger.warn('snowgrass error', {
      service: 'cam',
      type: 'snowgrass'
    });
  }
}
