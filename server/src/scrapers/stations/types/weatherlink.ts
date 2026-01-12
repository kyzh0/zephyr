import pLimit from 'p-limit';

import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/stations/processScrapedData';
import logger from '@/lib/logger';

import { type StationAttrs } from '@/models/stationModel';
import { type WithId } from '@/types/mongoose';

type WeatherLinkSensorDataType = {
  sensorDataName: string;
  dataValue?: number | null;
};

type WeatherLinkLogicalSensor = {
  productName: string;
  sensorDataType?: WeatherLinkSensorDataType[];
};

type WeatherLinkMaiaItem = {
  logicalSensor?: WeatherLinkLogicalSensor[];
};

type WeatherLinkResponse = {
  oMaiaData?: WeatherLinkMaiaItem[];
};

export default async function scrapeWeatherLinkData(
  stations: WithId<StationAttrs>[]
): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage: number | null = null;
          let windGust: number | null = null;
          let windBearing: number | null = null;
          let temperature: number | null = null;

          const { data } = await httpClient.get<WeatherLinkResponse>(
            `https://www.weatherlink.com/bulletin/data/${station.externalId}`,
            {
              headers: {
                Cookie: station.weatherlinkCookie ?? ''
              }
            }
          );

          const omd = data?.oMaiaData?.length === 1 ? data.oMaiaData[0] : undefined;
          const sensors = omd?.logicalSensor;
          if (sensors?.length) {
            const sensor = sensors.find((x) => x.productName === 'Temp/Hum');
            const types = sensor?.sensorDataType;

            if (types?.length) {
              const avgData = types.find((x) => x.sensorDataName === '10 Min Avg Wind Speed');
              if (avgData?.dataValue != null) {
                windAverage = Math.round(avgData.dataValue * 1.609 * 10) / 10; // mph -> km/h
              }

              const gustData = types.find((x) => x.sensorDataName === '10 Min High Wind Speed');
              if (gustData?.dataValue != null) {
                windGust = Math.round(gustData.dataValue * 1.609 * 10) / 10;
              }

              const bearingData = types.find(
                (x) => x.sensorDataName === '10 Min Scalar Avg Wind Direction'
              );
              if (bearingData?.dataValue != null) {
                windBearing = bearingData.dataValue;
              }

              const tempData = types.find((x) => x.sensorDataName === 'Temp');
              if (tempData?.dataValue != null) {
                temperature = Math.round((((tempData.dataValue - 32) * 5) / 9) * 10) / 10; // F -> C
              }
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch {
          logger.warn(`weatherlink error - ${station.externalId}`, {
            service: 'station',
            type: 'wl'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
