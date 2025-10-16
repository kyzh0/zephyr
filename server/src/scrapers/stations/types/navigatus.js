import pLimit from 'p-limit';
import { fromZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeNavigatusData(stations) {
  const limit = pLimit(10);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage = null;
          let windGust = null;
          let windBearing = null;
          let temperature = null;

          if (station.externalId.toUpperCase() === 'NZQNWX') {
            const { data } = await httpClient.get(
              `https://nzqnwx.navigatus.aero/frontend/kelvin_iframe`
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
                    switch (dirStr.toUpperCase()) {
                      case 'NORTHERLY':
                        windBearing = 0;
                        break;
                      case 'NORTH-EASTERLY':
                        windBearing = 45;
                        break;
                      case 'EASTERLY':
                        windBearing = 90;
                        break;
                      case 'SOUTH-EASTERLY':
                        windBearing = 135;
                        break;
                      case 'SOUTHERLY':
                        windBearing = 180;
                        break;
                      case 'SOUTH-WESTERLY':
                        windBearing = 225;
                        break;
                      case 'WESTERLY':
                        windBearing = 270;
                        break;
                      case 'NORTH-WESTERLY':
                        windBearing = 315;
                        break;
                      default:
                        break;
                    }
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
                    if (!isNaN(temp)) windAverage = temp;
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
                  if (!isNaN(temp)) temperature = temp;
                }
              }
            }
          } else if (station.externalId.toUpperCase() === 'OMARAMA') {
            const { data } = await httpClient.get('https://omarama.navigatus.aero/get_new_data/3');
            if (data) {
              windAverage = Math.round(data.average_speed * 1.852 * 100) / 100; // kt
              windGust = Math.round(data.max_gust * 1.852 * 100) / 100;
              windBearing = data.average_dir;

              if (data.wind_data) temperature = data.wind_data.temperature;
            }
          } else if (station.externalId.toUpperCase() === 'SLOPEHILL') {
            const { data } = await httpClient.get(
              'https://nzqnwx2.navigatus.aero/frontend/json_latest_data'
            );
            if (data) {
              const lastUpdate = fromZonedTime(
                parse(data.date_local, 'yyyy-MM-dd HH:mm:ss', new Date()),
                'Pacific/Auckland'
              );
              // skip if data older than 20 min
              if (Date.now() - lastUpdate.getTime() < 20 * 60 * 1000) {
                windAverage = Math.round(data.wind_speed * 1.852 * 100) / 100; // kt
                windGust = Math.round(data.wind_gust * 1.852 * 100) / 100;
                windBearing = data.wind_direction;
                temperature = data.air_temperature;
              }
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch (error) {
          logger.warn(
            `An error occured while fetching data for navigatus - ${station.externalId}`,
            {
              service: 'station',
              type: 'navigatus'
            }
          );

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
