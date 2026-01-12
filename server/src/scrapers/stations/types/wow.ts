import pLimit from 'p-limit';
import { formatInTimeZone } from 'date-fns-tz';

import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/stations/processScrapedData';
import logger from '@/lib/logger';

import { type StationAttrs } from '@/models/stationModel';
import { type WithId } from '@/types/mongoose';

type WowObservation = {
  ReportEndDateTime: string;
  windSpeed_MetrePerSecond?: number;
  windGust_MetrePerSecond?: number;
  windDirection?: number;
  dryBulbTemperature_Celsius?: number;
};

type WowResponse = {
  Observations?: WowObservation[];
};

export default async function scrapeWowData(stations: WithId<StationAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage: number | null = null;
          let windGust: number | null = null;
          let windBearing: number | null = null;
          let temperature: number | null = null;

          const { data } = await httpClient.get<WowResponse>(
            `https://wow.metoffice.gov.uk/observations/details/tableviewdata/${station.externalId}/details/${formatInTimeZone(
              new Date(),
              'UTC',
              'yyyy-MM-dd'
            )}`
          );

          const d = data.Observations?.[0];
          if (d) {
            const time = new Date(d.ReportEndDateTime);
            // only update if data is <20min old
            if (!Number.isNaN(time.getTime()) && Date.now() - time.getTime() < 20 * 60 * 1000) {
              if (d.windSpeed_MetrePerSecond && Number.isFinite(d.windSpeed_MetrePerSecond))
                windAverage = d.windSpeed_MetrePerSecond * 3.6; // m/s -> km/h
              if (d.windGust_MetrePerSecond && Number.isFinite(d.windGust_MetrePerSecond))
                windGust = d.windGust_MetrePerSecond * 3.6;
              if (d.windDirection && Number.isFinite(d.windDirection))
                windBearing = d.windDirection;
              if (d.dryBulbTemperature_Celsius && Number.isFinite(d.dryBulbTemperature_Celsius))
                temperature = d.dryBulbTemperature_Celsius;
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch {
          logger.warn(`wow error - ${station.externalId}`, {
            service: 'station',
            type: 'wow'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
