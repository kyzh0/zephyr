import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/stations/processScrapedData';
import logger from '@/lib/logger';

import type { StationDoc } from '@/models/stationModel';

export default async function scrapeHuttWeatherData(stations: StationDoc[]): Promise<void> {
  const station = stations[0];
  if (!station) return;

  try {
    let windAverage: number | null = null;
    let windGust: number | null = null;
    let windBearing: number | null = null;
    let temperature: number | null = null;

    const { data } = await httpClient.get<string>('https://www.huttweather.co.nz/pwsWD/');
    if (data.length) {
      // wind avg
      let startStr =
        '<td style="font-size: 15px; text-align: right; border-right: 1px solid  black;"><b>';
      let i = data.indexOf(startStr);
      if (i >= 0) {
        const j = data.indexOf('</b>&nbsp;</td>', i);
        if (j > i) {
          const temp = Number(data.slice(i + startStr.length, j).trim());
          if (Number.isFinite(temp)) windAverage = temp;
        }
      }

      // wind gust
      startStr = '<td style="font-size: 15px; text-align: left;  width: 50%; ">&nbsp;<b>';
      i = data.indexOf(startStr);
      if (i >= 0) {
        const j = data.indexOf('</b></td>', i);
        if (j > i) {
          const temp = Number(data.slice(i + startStr.length, j).trim());
          if (Number.isFinite(temp)) windGust = temp;
        }
      }

      // wind direction
      startStr =
        '<td colspan="2" style="height: 24px; text-align: center; border-top: 1px solid   black;">';
      i = data.indexOf(startStr);
      if (i >= 0) {
        const j = data.indexOf('&deg;  <b>', i);
        if (j > i) {
          const temp = Number(data.slice(i + startStr.length, j).trim());
          if (Number.isFinite(temp)) windBearing = temp;
        }
      }

      // temperature
      startStr = '<b style="font-size: 20px;">';
      i = data.indexOf(startStr);
      if (i >= 0) {
        const j = data.indexOf('&deg;</b>', i);
        if (j > i) {
          const temp = Number(data.slice(i + startStr.length, j).trim());
          if (Number.isFinite(temp)) temperature = temp;
        }
      }
    }

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch {
    logger.warn('hutt weather error', {
      service: 'station',
      type: 'hw'
    });

    await processScrapedData(station, null, null, null, null, true);
  }
}
