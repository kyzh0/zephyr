import { httpClient, logger, type StationAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

export default async function scrapeMrcData(stations: WithId<StationAttrs>[]): Promise<void> {
  const station = stations[0];
  if (!station) {
    return;
  }

  try {
    let windAverage: number | null = null;
    let windGust: number | null = null;
    let windBearing: number | null = null;
    let temperature: number | null = null;

    const { data } = await httpClient.post<string>(
      'https://www.otago.ac.nz/surveying/potree/remote/pisa_meteo/OtagoUni_PisaRange_PisaMeteo.csv',
      undefined,
      { responseType: 'text' }
    );

    const matches = data.match(/"[0-9]{4}-[0-9]{2}-[0-9]{2}\s[0-9]{2}:[0-9]{2}:[0-9]{2}"/g);
    if (matches?.length) {
      const lastRow = data.slice(data.lastIndexOf(matches[matches.length - 1]));
      const cols = lastRow.split(',');

      if (cols.length === 39) {
        const avg = Number(cols[23]);
        const gust = Number(cols[26]);
        const bearing = Number(cols[24]);
        const temp = Number(cols[7]);

        windAverage = Number.isNaN(avg) ? null : Math.round(avg * 3.6 * 100) / 100; // m/s -> km/h
        windGust = Number.isNaN(gust) ? null : Math.round(gust * 3.6 * 100) / 100;
        windBearing = Number.isNaN(bearing) ? null : bearing;
        temperature = Number.isNaN(temp) ? null : temp;
      }
    }

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch {
    logger.warn('mrc error', { service: 'station', type: 'mrc' });
    await processScrapedData(station, null, null, null, null, true);
  }
}
