import { httpClient, logger, type StationAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';
import { isTimestampFresh } from '@/lib/utils';

type SouthPortResponse = [SouthPortData];

type SouthPortData = {
  validTime_Utc: string;
  speed_kn: number;
  gust_kn: number;
  from_deg: number;
};

export default async function scrapeSouthPortData(stations: WithId<StationAttrs>[]): Promise<void> {
  const station = stations[0];
  if (!station) {
    return;
  }

  try {
    let windAverage: number | null = null;
    let windGust: number | null = null;
    let windBearing: number | null = null;
    const temperature: number | null = null;

    const DAY_MS = 24 * 60 * 60 * 1000;

    const toUtcString = (date: number) => {
      const d = new Date(date);
      d.setUTCSeconds(0, 0);
      return d.toISOString();
    };

    const now = Date.now();
    const fromDate = toUtcString(now - DAY_MS);
    const toDate = toUtcString(now + DAY_MS);

    const url = new URL(
      'https://portweather-public.omcinternational.com/api/datasources/proxy/uid/4puRxBBMk//api/data/transformRecordsFromPackets'
    );
    url.searchParams.set('sourcePath', 'NZ/Bluff/Wind/Measured/Beacon2');
    url.searchParams.set('transformer', 'LatestNoTransform');
    url.searchParams.set('fromDate_Utc', fromDate);
    url.searchParams.set('toDate_Utc', toDate);
    url.searchParams.set('qaStatusesString', 'GOOD_DATA');

    const { data } = await httpClient.get<SouthPortResponse>(url.toString(), {
      headers: {
        'x-grafana-org-id': '338'
      }
    });

    if (data.length) {
      const d = data[data.length - 1];
      const time = new Date(d.validTime_Utc);

      if (isTimestampFresh(time)) {
        windAverage = Math.round(d.speed_kn * 1.852 * 10) / 10; // kt -> km/h
        windGust = Math.round(d.gust_kn * 1.852 * 10) / 10;
        windBearing = Number(d.from_deg);
      } else {
        logger.warn('southport stale data', {
          service: 'station',
          type: 'sp'
        });
      }
    }

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch (error) {
    logger.warn('southport error', { service: 'station', type: 'sp' });
    await processScrapedData(station, null, null, null, null, true);
  }
}
