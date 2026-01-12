import pLimit from 'p-limit';

import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/stations/processScrapedData';
import logger from '@/lib/logger';

import type { StationDoc } from '@/models/stationModel';

function extractSeriesValue(html: string, seriesName: string): number | null {
  const nameTag = `<p class="seriesName">${seriesName}</p>`;
  const i = html.indexOf(nameTag);
  if (i < 0) return null;

  const valueTag = '<p class="seriesValue">';
  const j = html.indexOf(valueTag, i);
  if (j < 0) return null;

  const k = html.indexOf('</p>', j);
  if (k < 0) return null;

  const n = Number(html.slice(j + valueTag.length, k).trim());
  return Number.isNaN(n) ? null : n;
}

export default async function scrapePortOtagoData(stations: StationDoc[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage: number | null = null;
          let windGust: number | null = null;
          let windBearing: number | null = null;
          const temperature: number | null = null;

          const { data } = await httpClient.get<string>(
            `https://dvp.portotago.co.nz/dvp/graphs/htmx/get-graph/${station.externalId}`
          );

          if (data.length) {
            const avgKt = extractSeriesValue(data, 'Wind Speed Avg');
            if (avgKt != null) windAverage = Math.round(avgKt * 1.852 * 100) / 100;

            const gustKt = extractSeriesValue(data, 'Wind Gust Max');
            if (gustKt != null) windGust = Math.round(gustKt * 1.852 * 100) / 100;

            const dir = extractSeriesValue(data, 'Wind Dir Avg');
            if (dir != null) windBearing = dir;
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch {
          logger.warn(`port otago error - ${station.externalId}`, {
            service: 'station',
            type: 'po'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
