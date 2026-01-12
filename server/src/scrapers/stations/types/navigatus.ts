import pLimit from 'p-limit';
import { fromZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';

import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/stations/processScrapedData';
import logger from '@/lib/logger';

import { type StationAttrs } from '@/models/stationModel';
import { type WithId } from '@/types/mongoose';

type OmaramaResponse = {
  average_speed?: number;
  max_gust?: number;
  average_dir?: number;
  wind_data?: { temperature?: number | null };
};

type SlopehillResponse = {
  date_local: string; // "yyyy-MM-dd HH:mm:ss"
  wind_speed?: number;
  wind_gust?: number;
  wind_direction?: number;
  air_temperature?: number;
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
                    if (!Number.isNaN(temp)) windAverage = temp;
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
                  if (!Number.isNaN(temp)) temperature = temp;
                }
              }
            }
          } else if (id === 'OMARAMA') {
            const { data } = await httpClient.get<OmaramaResponse>(
              'https://omarama.navigatus.aero/get_new_data/3'
            );

            if (data) {
              if (typeof data.average_speed === 'number') {
                windAverage = Math.round(data.average_speed * 1.852 * 100) / 100; // kt -> km/h
              }
              if (typeof data.max_gust === 'number') {
                windGust = Math.round(data.max_gust * 1.852 * 100) / 100;
              }
              if (typeof data.average_dir === 'number') {
                windBearing = data.average_dir;
              }
              temperature = data.wind_data?.temperature ?? null;
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
                if (typeof data.wind_speed === 'number') {
                  windAverage = Math.round(data.wind_speed * 1.852 * 100) / 100;
                }
                if (typeof data.wind_gust === 'number') {
                  windGust = Math.round(data.wind_gust * 1.852 * 100) / 100;
                }
                windBearing = data.wind_direction ?? null;
                temperature = data.air_temperature ?? null;
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
