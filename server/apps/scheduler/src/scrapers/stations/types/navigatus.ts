import pLimit from 'p-limit';
import { fromZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';

import { httpClient, logger, type StationAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

type OmaramaResponse = {
  average_speed?: number | string;
  max_gust?: number | string;
  average_dir?: number | string;
  wind_data?: { temperature?: number | string | null };
};

type SlopehillResponse = {
  date_local: string; // "yyyy-MM-dd HH:mm:ss"
  wind_speed?: number | string;
  wind_gust?: number | string;
  wind_direction?: number | string;
  air_temperature?: number | string;
};

function navigatusDirToBearing(dir: string): number | null {
  switch (dir.trim().toUpperCase()) {
    case 'NORTHERLY':
      return 0;
    case 'NORTH-EASTERLY':
      return 45;
    case 'EASTERLY':
      return 90;
    case 'SOUTH-EASTERLY':
      return 135;
    case 'SOUTHERLY':
      return 180;
    case 'SOUTH-WESTERLY':
      return 225;
    case 'WESTERLY':
      return 270;
    case 'NORTH-WESTERLY':
      return 315;
    default:
      return null;
  }
}

export default async function scrapeNavigatusData(stations: WithId<StationAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage: number | null = null;
          let windGust: number | null = null;
          let windBearing: number | null = null;
          let temperature: number | null = null;

          const id = station.externalId?.toUpperCase() ?? '';

          if (id === 'NZQNWX') {
            const { data } = await httpClient.get<string>(
              'https://nzqnwx.navigatus.aero/frontend/kelvin_iframe'
            );

            if (data.length) {
              // wind direction
              let dirStr = '';
              let startStr = '<div class="wind-data">';
              let i = data.indexOf(startStr);

              if (i >= 0) {
                startStr = '<p>';
                const j = data.indexOf(startStr, i);
                if (j > i) {
                  const k = data.indexOf('</p>', j);
                  if (k > i) {
                    dirStr = data.slice(j + startStr.length, k).trim();
                    windBearing = navigatusDirToBearing(dirStr);
                  }
                }
              }

              // wind avg
              startStr = `<p>${dirStr}</p>`;
              i = data.indexOf(startStr);
              if (i >= 0) {
                const startStr1 = '<p>';
                const j = data.indexOf(startStr1, i + startStr.length);
                if (j > i) {
                  const k = data.indexOf('km/h</p>', j);
                  if (k > i) {
                    const temp = Number(data.slice(j + startStr1.length, k).trim());
                    if (!Number.isNaN(temp)) {
                      windAverage = temp;
                    }
                  }
                }
              }

              // temperature
              startStr = '<p>Temperature:';
              i = data.indexOf(startStr);
              if (i >= 0) {
                const j = data.indexOf('&deg;</p>', i);
                if (j > i) {
                  const temp = Number(data.slice(i + startStr.length, j).trim());
                  if (!Number.isNaN(temp)) {
                    temperature = temp;
                  }
                }
              }
            }
          } else if (id === 'OMARAMA') {
            const { data } = await httpClient.get<OmaramaResponse>(
              'https://omarama.navigatus.aero/get_new_data/3'
            );

            if (data) {
              const avg = Number(data.average_speed);
              if (data.average_speed !== null && Number.isFinite(avg)) {
                windAverage = Math.round(avg * 1.852 * 100) / 100;
              } // kt -> km/h

              const gust = Number(data.max_gust);
              if (data.max_gust !== null && Number.isFinite(gust)) {
                windGust = Math.round(gust * 1.852 * 100) / 100;
              }

              const dir = Number(data.average_dir);
              if (data.average_dir !== null && Number.isFinite(dir)) {
                windBearing = dir;
              }

              const temp = Number(data.wind_data?.temperature);
              if (data.wind_data?.temperature !== null && Number.isFinite(temp)) {
                temperature = temp;
              }
            }
          } else if (id === 'SLOPEHILL') {
            const { data } = await httpClient.get<SlopehillResponse>(
              'https://nzqnwx2.navigatus.aero/frontend/json_latest_data'
            );

            if (data?.date_local) {
              const lastUpdate = fromZonedTime(
                parse(data.date_local, 'yyyy-MM-dd HH:mm:ss', new Date()),
                'Pacific/Auckland'
              );

              // skip if data older than 20 min
              if (Date.now() - lastUpdate.getTime() < 20 * 60 * 1000) {
                const avg = Number(data.wind_speed);
                if (data.wind_speed !== null && Number.isFinite(avg)) {
                  windAverage = Math.round(avg * 1.852 * 100) / 100;
                } // kt -> km/h

                const gust = Number(data.wind_gust);
                if (data.wind_gust !== null && Number.isFinite(gust)) {
                  windGust = Math.round(gust * 1.852 * 100) / 100;
                }

                const dir = Number(data.wind_direction);
                if (data.wind_direction !== null && Number.isFinite(dir)) {
                  windBearing = dir;
                }

                const temp = Number(data.air_temperature);
                if (data.air_temperature !== null && Number.isFinite(temp)) {
                  temperature = temp;
                }
              }
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch {
          logger.warn(`navigatus error - ${station.externalId}`, {
            service: 'station',
            type: 'navigatus'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
