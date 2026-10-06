import { fromZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';

import { httpClient, logger, type StationAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';
import { isTimestampFresh } from '@/lib/utils';

type StationResult = {
  name: string;
  lastUpdate: Date;
  data: {
    windAverage: number | null | undefined;
    windGust: number | null | undefined;
    windBearing: number | null | undefined;
    temperature: number | null | undefined;
  };
};

type EnvdataField = {
  field: string;
  value: string;
};

type EnvdataSite = {
  name: string;
  dataTo: string;
  fields: [EnvdataField];
};

type EnvdataResponse = {
  sites: EnvdataSite[];
};

export default async function scrapeEnvdataData(stations: WithId<StationAttrs>[]): Promise<void> {
  try {
    const result: StationResult[] = [];

    const { data } = await httpClient.get<EnvdataResponse>(
      'https://envdata.es.govt.nz/services/sites.ashx?f=air.xml'
    );

    if (data.sites?.length) {
      for (const site of data.sites) {
        const avg = site.fields.find((f) => f.field === 'Wind Speed')?.value;
        const bearing = site.fields.find((f) => f.field === 'Wind Direction')?.value;
        const temp = site.fields.find((f) => f.field === 'Air Temperature')?.value;
        result.push({
          name: site.name,
          lastUpdate: fromZonedTime(
            parse(site.dataTo, 'dd/MM/yyyy HH:mm', new Date()),
            'Pacific/Auckland'
          ),
          data: {
            windAverage: avg != null && !isNaN(parseFloat(avg)) ? parseFloat(avg) : null,
            windGust: null,
            windBearing:
              bearing != null && !isNaN(parseFloat(bearing)) ? parseFloat(bearing) : null,
            temperature: temp != null && !isNaN(parseFloat(temp)) ? parseFloat(temp) : null
          }
        });
      }
    }

    for (const station of stations) {
      const d = result.find((x) => x.name === station.externalId);
      if (d) {
        if (isTimestampFresh(d.lastUpdate)) {
          await processScrapedData(
            station,
            d.data.windAverage ?? null,
            d.data.windGust ?? null,
            d.data.windBearing ?? null,
            d.data.temperature ?? null
          );
        } else {
          logger.warn(`envdata error - stale data for ${station.externalId}`, {
            service: 'station',
            type: 'envdata'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      } else {
        logger.warn(`envdata error - no data for ${station.externalId}`, {
          service: 'station',
          type: 'envdata'
        });

        await processScrapedData(station, null, null, null, null, true);
      }
    }
  } catch (error) {
    logger.warn('envdata error', { service: 'station', type: 'envdata' });

    const msg = error instanceof Error ? error.message : String(error);
    logger.warn(msg, { service: 'station', type: 'envdata' });

    for (const station of stations) {
      await processScrapedData(station, null, null, null, null, true);
    }
  }
}
