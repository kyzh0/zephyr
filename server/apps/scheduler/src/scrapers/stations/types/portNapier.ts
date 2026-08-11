import { fromZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';

import { httpClient, logger, type StationAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';
import { isTimestampFresh } from '@/lib/utils';

const URL =
  'https://ponlapp.napierport.co.nz/witswap/(S(krgcon23mxqr3ics4cazfux2))/MobileWebForm1.aspx';

function extractListValue(html: string, label: string): string | null {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<li>\\s*${escapedLabel}\\s*:\\s*([^<]*)</li>`));
  return match ? match[1].trim() : null;
}

export default async function scrapePortNapierData(
  stations: WithId<StationAttrs>[]
): Promise<void> {
  const station = stations[0];
  if (!station) {
    return;
  }

  try {
    let windAverage: number | null = null;
    let windGust: number | null = null;
    let windBearing: number | null = null;
    const temperature: number | null = null;

    const { data } = await httpClient.get<string>(URL, { responseType: 'text' });

    const date = extractListValue(data, 'Date');
    const time = extractListValue(data, 'NZST Time');

    let timestamp: Date | null = null;
    if (date && time) {
      timestamp = fromZonedTime(
        parse(`${date} ${time}`, 'dd/MM/yyyy HH:mm:ss', new Date()),
        'Pacific/Auckland'
      );
    }

    if (isTimestampFresh(timestamp)) {
      const speed = Number(extractListValue(data, 'Wind Speed (Spur)'));
      const gust = Number(extractListValue(data, 'Max Gust (Spur)'));
      const direction = Number(extractListValue(data, 'Wind Direct (Spur)'));

      windAverage = Number.isFinite(speed) ? Math.round(speed * 1.852 * 100) / 100 : null; // kt -> km/h
      windGust = Number.isFinite(gust) ? Math.round(gust * 1.852 * 100) / 100 : null; // kt -> km/h
      windBearing = Number.isFinite(direction) ? direction : null;
    } else {
      logger.warn('portNapier stale data', { service: 'station', type: 'napier' });
    }

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch {
    logger.warn('portNapier error', { service: 'station', type: 'napier' });

    await processScrapedData(station, null, null, null, null, true);
  }
}
