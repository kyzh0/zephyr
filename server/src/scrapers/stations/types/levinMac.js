import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeLevinMacData(stations) {
  const station = stations[0];

  try {
    let windAverage = null;
    let windGust = null;
    let windBearing = null;
    let temperature = null;

    const { data } = await httpClient.post(
      'https://www.ecowitt.net/index/home',
      {
        device_id: 'MzdqYkJqWlBsbWYzREMzdkJpREs1dz09',
        authorize: '22NU86'
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    if (data && data.data) {
      windAverage = Number(data.data.wind.data.windspeedmph.value); // actually kmh
      windGust = Number(data.data.wind.data.windgustmph.value);
      windBearing = Number(data.data.wind.data.winddir.value);
      temperature = Number(data.data.temp.data.tempf.value); // actually celsius
    }

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch (error) {
    logger.warn('levin error', {
      service: 'station',
      type: 'levin'
    });

    await processScrapedData(station, null, null, null, null, true);
  }
}
