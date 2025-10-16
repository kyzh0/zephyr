import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeTaylorsSurfData(cams) {
  const cam = cams[0];

  try {
    let updated = null;
    let base64 = null;

    const response = await httpClient.get('https://stream.webmad.co.nz/shots/taylorssouth2.jpg', {
      responseType: 'arraybuffer'
    });
    base64 = Buffer.from(response.data, 'binary').toString('base64');
    updated = new Date();

    processScrapedData(cam, updated, base64);
  } catch (error) {
    logger.warn('An error occured while fetching images for taylors surf', {
      service: 'cam',
      type: 'ts'
    });
  }
}
