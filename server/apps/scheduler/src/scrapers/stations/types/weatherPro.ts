import pLimit from 'p-limit';
import { fromZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';

import { httpClient, logger, type StationAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

function extractNumber(html: string, startStr: string, endStr: string): number | null {
  const i = html.indexOf(startStr);
  if (i < 0) {
    return null;
  }

  const j = html.indexOf(endStr, i);
  if (j <= i) {
    return null;
  }

  const n = Number(html.slice(i + startStr.length, j).trim());
  return Number.isNaN(n) ? null : n;
}

export default async function scrapeWeatherProData(
  stations: WithId<StationAttrs>[]
): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage: number | null = null;
          const windGust: number | null = null;
          let windBearing: number | null = null;
          let temperature: number | null = null;

          const { data } = await httpClient.get<string>(
            `https://www.weather-pro.com/reports/Realtime.php?SN=${station.externalId}`
          );

          if (data.length) {
            let time: Date | null = null;
            const startStr = '</u><br>';
            const i = data.indexOf(startStr);
            if (i > 0) {
              const j = data.indexOf('</strong><br>', i);
              if (j > i) {
                const timeStr = data.slice(i + startStr.length, j).trim();
                time = fromZonedTime(
                  parse(timeStr, 'dd MMM yyyy h:mm a', new Date()),
                  'Pacific/Auckland'
                );
              }
            }

            // skip if older than 20 mins
            if (time && Date.now() - time.getTime() < 20 * 60 * 1000) {
              windAverage = extractNumber(
                data,
                'Wind Speed</td><td style="font-size:200%;">:',
                'kph</td></tr>'
              );

              windBearing = extractNumber(
                data,
                'Wind Direction</td><td style="font-size:200%;">:',
                '°</td></tr>'
              );

              temperature = extractNumber(
                data,
                'Air Temperature</td><td style="font-size:200%;">:',
                '°C</td></tr>'
              );
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch {
          logger.warn(`weatherpro error - ${station.externalId}`, {
            service: 'station',
            type: 'wp'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
