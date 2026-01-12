import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/stations/processScrapedData';
import logger from '@/lib/logger';

import type { StationDoc } from '@/models/stationModel';

export default async function scrapeWainuiData(stations: StationDoc[]): Promise<void> {
  const station = stations[0];
  if (!station) return;

  try {
    let windAverage: number | null = null;
    const windGust: number | null = null;
    let windBearing: number | null = null;
    let temperature: number | null = null;

    const { data } = await httpClient.get<string>(
      'http://mcgavin.no-ip.info/weather/wainui/index.html'
    );

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
            if (!Number.isNaN(temp)) windBearing = temp;
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
              if (!Number.isNaN(temp)) windAverage = temp;
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
            if (!Number.isNaN(temp)) temperature = temp;
          }
        }
      }
    }

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch {
    logger.warn('wainui error', { service: 'station', type: 'wainui' });
    await processScrapedData(station, null, null, null, null, true);
  }
}
