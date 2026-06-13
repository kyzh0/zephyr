import pLimit from 'p-limit';

import {
  httpClient,
  logger,
  getWindBearingFromDirection,
  type StationAttrs,
  type WithId
} from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

function parseNum(s: string | null): number | null {
  if (!s) {
    return null;
  }
  const match = s.match(/^-?[\d.]+/);
  if (!match) {
    return null;
  }
  const n = Number(match[0]);
  return Number.isNaN(n) ? null : n;
}

function extractValue(html: string, labelText: string): string | null {
  const labelIdx = html.indexOf(labelText);
  if (labelIdx < 0) {
    return null;
  }
  const valueTag = '<span class="value">';
  const valueStart = html.indexOf(valueTag, labelIdx);
  if (valueStart < 0) {
    return null;
  }
  const contentStart = valueStart + valueTag.length;
  const contentEnd = html.indexOf('</span>', contentStart);
  if (contentEnd <= contentStart) {
    return null;
  }
  return html.slice(contentStart, contentEnd).trim();
}

export default async function scrapeCwuData(stations: WithId<StationAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage: number | null = null;
          let windGust: number | null = null;
          let windBearing: number | null = null;
          let temperature: number | null = null;

          const { data } = await httpClient.get<string>(
            `https://cwu.co.nz/forecast/${station.externalId}/`,
            { responseType: 'text' }
          );

          if (data.length) {
            temperature = parseNum(extractValue(data, 'TEMPERATURE'));
            windAverage = parseNum(extractValue(data, 'WIND SPEED'));
            windGust = parseNum(extractValue(data, 'WIND GUSTS'));

            const dirValue = extractValue(data, 'WIND DIRECTION');
            if (dirValue) {
              windBearing = getWindBearingFromDirection(dirValue);
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch {
          logger.warn(`cwu error - ${station.externalId}`, {
            service: 'station',
            type: 'cwu'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
