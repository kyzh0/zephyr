import { fromZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';

import { httpClient, logger, type StationAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';
import { isTimestampFresh } from '@/lib/utils';

const LOGIN_URL = 'https://weather.shpg.co.nz/';
const AJAX_URL = 'https://www.envirodata.co.nz/functions/station_get_ajax.php';

type ShpgVariable = {
  value: string;
  timestamp: string;
};

async function getSessionCookie(): Promise<string | null> {
  const response = await httpClient.get(LOGIN_URL);
  const setCookie = response.headers['set-cookie'];
  if (!setCookie?.length) {
    return null;
  }

  // login redirect chain sets PHPSESSID twice; the last one is the one that sticks
  return setCookie[setCookie.length - 1].split(';')[0];
}

async function fetchVariable(
  cookie: string,
  variableId: number,
  precision: number,
  label: string
): Promise<number | null> {
  const { data } = await httpClient.post<ShpgVariable>(
    AJAX_URL,
    `variableId=${variableId}&actionId=3&precision=${precision}`,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        Cookie: cookie
      }
    }
  );

  const value = Number(data?.value);
  if (!data || !Number.isFinite(value)) {
    return null;
  }

  const timestamp = fromZonedTime(
    parse(data.timestamp, 'yyyy-MM-dd HH:mm:ss', new Date()),
    'Pacific/Auckland'
  );

  if (!isTimestampFresh(timestamp)) {
    logger.warn(`shpg stale data - ${label}`, { service: 'station', type: 'shpg' });
    return null;
  }

  return value;
}

export default async function scrapeShpgData(stations: WithId<StationAttrs>[]): Promise<void> {
  const station = stations[0];
  if (!station) {
    return;
  }

  try {
    let windAverage: number | null = null;
    const windGust = null;
    let windBearing: number | null = null;
    let temperature: number | null = null;

    const cookie = await getSessionCookie();
    if (!cookie) {
      throw new Error('failed to obtain session cookie');
    }

    temperature = await fetchVariable(cookie, 16058, 2, 'temperature');
    windAverage = await fetchVariable(cookie, 16089, -1, 'wind speed');
    windBearing = await fetchVariable(cookie, 16062, -1, 'wind direction');

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch {
    logger.warn('shpg error', { service: 'station', type: 'shpg' });
    await processScrapedData(station, null, null, null, null, true);
  }
}
