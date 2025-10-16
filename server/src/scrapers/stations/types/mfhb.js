import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeMfhbData(stations) {
  const station = stations[0];

  try {
    let windAverage = null;
    const windGust = null;
    let windBearing = null;
    let temperature = null;

    const { data } = await httpClient.get(
      'https://www.weatherlink.com/embeddablePage/getData/5e1372c8fe104ac5acc1fe2d8cb8b85c'
    );
    if (data) {
      windAverage = data.wind;
      windBearing = data.windDirection;
      temperature = data.temperature;
    }

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch (error) {
    logger.warn('An error occured while fetching data for mfhb', {
      service: 'station',
      type: 'mfhb'
    });

    await processScrapedData(station, null, null, null, null, true);
  }
}
