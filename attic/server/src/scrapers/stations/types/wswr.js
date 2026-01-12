import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeWswrData(stations) {
  const station = stations[0];

  try {
    let windAverage = null;
    let windGust = null;
    let windBearing = null;
    let temperature = null;

    const { data } = await httpClient.get('https://api.wswr.jkent.tech/weatherdata/mostrecent/60');
    if (data && data.length) {
      const d = data[0];
      const time = new Date(`${d.record_time}.000Z`);
      if (Date.now() - time.getTime() < 20 * 60 * 1000) {
        windAverage = Math.round(d.windspd_10mnavg * 1.852 * 10) / 10;
        windGust = Math.round(d.windgst_10mnmax * 1.852 * 10) / 10;
        windBearing = d.winddir_10mnavg;
        temperature = d.airtemp_01mnavg;
      }
    }

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch (error) {
    logger.warn('wswr error', {
      service: 'station',
      type: 'wswr'
    });

    await processScrapedData(station, null, null, null, null, true);
  }
}
