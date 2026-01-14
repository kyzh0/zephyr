import pLimit from 'p-limit';
import { formatInTimeZone } from 'date-fns-tz';

import { httpClient, logger, type StationAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

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
              const avg = Number(d.windSpeed_MetrePerSecond);
              if (d.windSpeed_MetrePerSecond !== null && Number.isFinite(avg)) {
                windAverage = avg * 3.6;
              } // m/s -> km/h

              const gust = Number(d.windGust_MetrePerSecond);
              if (d.windGust_MetrePerSecond !== null && Number.isFinite(gust)) {
                windGust = gust * 3.6;
              }

              const dir = Number(d.windDirection);
              if (d.windDirection !== null && Number.isFinite(dir)) {
                windBearing = dir;
              }

              const temp = Number(d.dryBulbTemperature_Celsius);
              if (d.dryBulbTemperature_Celsius !== null && Number.isFinite(temp)) {
                temperature = temp;
              }
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
