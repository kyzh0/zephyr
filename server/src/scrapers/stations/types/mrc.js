import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeMrcData(stations) {
  const station = stations[0];

  try {
    let windAverage = null;
    let windGust = null;
    let windBearing = null;
    let temperature = null;

    const { data } = await httpClient.post(
      'https://www.otago.ac.nz/surveying/potree/remote/pisa_meteo/OtagoUni_PisaRange_PisaMeteo.csv',
      {
        responseType: 'text'
      }
    );
    const matches = data.match(/"[0-9]{4}-[0-9]{2}-[0-9]{2}\s[0-9]{2}:[0-9]{2}:[0-9]{2}"/g);
    if (matches && matches.length) {
      const lastRow = data.slice(data.lastIndexOf(matches[matches.length - 1]));
      const temp = lastRow.split(',');
      if (temp.length == 39) {
        windAverage = Math.round(Number(temp[23]) * 3.6 * 100) / 100;
        windGust = Math.round(Number(temp[26]) * 3.6 * 100) / 100;
        windBearing = Number(temp[24]);
        temperature = Number(temp[7]);
      }
    }

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch (error) {
    logger.warn('An error occured while fetching data for mrc', {
      service: 'station',
      type: 'mrc'
    });

    await processScrapedData(station, null, null, null, null, true);
  }
}
