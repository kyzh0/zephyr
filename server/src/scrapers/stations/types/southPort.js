import { fromZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/log.js';

export default async function scrapeSouthPortData(stations) {
  const station = stations[0];

  try {
    let windAverage = null;
    let windGust = null;
    let windBearing = null;
    let temperature = null;

    const { data } = await httpClient.get(
      'https://southportvendor.marketsouth.co.nz/testAPI/getBaconWindData.php?_=1760437457410'
    );
    if (data) {
      const time = fromZonedTime(
        parse(data.lastReading, 'yyyy-MM-dd HH:mm:ss', new Date()),
        'Pacific/Auckland'
      );
      if (Date.now() - time.getTime() < 20 * 60 * 1000) {
        windAverage = Math.round(data.AveSpeed * 1.852 * 10) / 10;
        windGust = Math.round(data.GustSpeed * 1.852 * 10) / 10;
        windBearing = Number(data.AveDirection);
      }
    }

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch (error) {
    logger.warn('An error occured while fetching data for south port', {
      service: 'station',
      type: 'sp'
    });

    await processScrapedData(station, null, null, null, null, true);
  }
}
