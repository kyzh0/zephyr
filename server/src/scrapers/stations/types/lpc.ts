import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/stations/processScrapedData';
import logger from '@/lib/logger';

import { type StationAttrs } from '@/models/stationModel';
import { type WithId } from '@/types/mongoose';

type LpcWindRow = {
  windspd_01mnavg: number;
  windgst_01mnmax: number;
  winddir_01mnavg: number;
};

type GrafanaQueryResponse = {
  results: Record<
    string,
    {
      frames?: Array<{
        data?: {
          values?: unknown[];
        };
      }>;
    }
  >;
};

export default async function scrapeLpcData(stations: WithId<StationAttrs>[]): Promise<void> {
  const station = stations[0];
  if (!station) return;

  try {
    let windAverage: number | null = null;
    let windGust: number | null = null;
    let windBearing: number | null = null;
    let temperature: number | null = null;

    let date = new Date();
    const dateTo = date.toISOString();
    date = new Date(date.getTime() - 1441 * 60 * 1000); // current time - (1 day + 1 min)
    const dateFrom = date.toISOString();

    const { data } = await httpClient.get<LpcWindRow[]>(
      'https://portweather-public.omcinternational.com/api/datasources/proxy/391//api/data/transformRecordsFromPackets' +
        `?sourcePath=${encodeURIComponent('NZ/Lyttelton/Meteo/Measured/Lyttelton TABW')}` +
        '&transformer=LatestNoTransform' +
        `&fromDate_Utc=${encodeURIComponent(dateFrom)}` +
        `&toDate_Utc=${encodeURIComponent(dateTo)}` +
        '&qaStatusesString=*',
      {
        headers: { 'x-grafana-org-id': 338 }
      }
    );

    if (data.length && data[0]) {
      windAverage = Math.round(data[0].windspd_01mnavg * 1.852 * 100) / 100; // kt -> km/h
      windGust = Math.round(data[0].windgst_01mnmax * 1.852 * 100) / 100;
      windBearing = data[0].winddir_01mnavg;
    }

    const resp = await httpClient.post<GrafanaQueryResponse>(
      'https://portweather-public.omcinternational.com/api/ds/query',
      {
        from: dateFrom,
        queries: [
          {
            datasourceId: 391,
            sourcePath: 'NZ/Lyttelton/Meteo/Measured/Lyttelton IHJ3',
            sourceProperty: 'airtemp_01mnavg',
            transformerType: 'LatestMeasuredGenericPlot',
            type: 'timeseries'
          }
        ],
        to: dateTo
      }
    );

    const frames = resp.data.results?.['']?.frames;
    const values = frames?.[0]?.data?.values;

    // values[1] is temperature array
    const temps = Array.isArray(values) && values.length >= 2 ? (values[1] as unknown) : null;
    if (Array.isArray(temps) && temps.length) {
      const t0 = temps[0];
      temperature = typeof t0 === 'number' ? t0 : Number(t0);
      if (Number.isNaN(temperature)) temperature = null;
    }

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch {
    logger.warn('lpc error', { service: 'station', type: 'lpc' });
    await processScrapedData(station, null, null, null, null, true);
  }
}
