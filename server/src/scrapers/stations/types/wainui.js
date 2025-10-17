import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeWainuiData(stations) {
  const station = stations[0];

  try {
    let windAverage = null;
    let windGust = null;
    let windBearing = null;
    let temperature = null;

    const { data } = await httpClient.get('http://mcgavin.no-ip.info/weather/wainui/index.html');
    if (data.length) {
      // wind direction
      let startStr = '<td><b>Wind Direction</b> (average 1 minute)</td>';
      let i = data.indexOf(startStr);
      if (i >= 0) {
        const startStr1 = '<td><b>';
        const j = data.indexOf(startStr1, i + startStr.length);
        if (j > i) {
          const k = data.indexOf('&#176;', j);
          if (k > i) {
            const temp = Number(data.slice(j + startStr1.length, k).trim());
            if (!isNaN(temp)) windBearing = temp;
          }
        }
      }

      // wind avg
      startStr = '<td><b>Wind Speed</b> (average 1 minute)</td>';
      i = data.indexOf(startStr);
      if (i >= 0) {
        const startStr1 = '<td><b>';
        const j = data.indexOf(startStr1, i + startStr.length);
        if (j > i) {
          const k = data.indexOf('</b></td>', j);
          if (k > i) {
            const temp1 = data
              .slice(j + startStr1.length, k)
              .replace('km/h', '')
              .trim();
            if (temp1.toUpperCase() === 'CALM') {
              windAverage = 0;
            } else {
              const temp = Number(temp1);
              if (!isNaN(temp)) windAverage = temp;
            }
          }
        }
      }

      // temperature
      startStr = '<td><b>Temperature</b></td>';
      i = data.indexOf(startStr);
      if (i >= 0) {
        const startStr1 = '<td><b>';
        const j = data.indexOf(startStr1, i + startStr.length);
        if (j > i) {
          const k = data.indexOf('&#176;', j);
          if (k > i) {
            const temp = Number(data.slice(j + startStr1.length + 1, k).trim());
            if (!isNaN(temp)) temperature = temp;
          }
        }
      }
    }

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch (error) {
    logger.warn('wainui error', {
      service: 'station',
      type: 'wainui'
    });

    await processScrapedData(station, null, null, null, null, true);
  }
}
