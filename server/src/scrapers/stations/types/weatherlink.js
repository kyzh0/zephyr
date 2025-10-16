import pLimit from 'p-limit';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/log.js';

export default async function scrapeWeatherLinkData(stations) {
  const limit = pLimit(10);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage = null;
          let windGust = null;
          let windBearing = null;
          let temperature = null;

          const { data } = await httpClient.get(
            `https://www.weatherlink.com/bulletin/data/${station.externalId}`,
            {
              headers: {
                Cookie: station.weatherlinkCookie
              }
            }
          );
          if (data && data.oMaiaData && data.oMaiaData.length === 1) {
            const omd = data.oMaiaData[0];
            if (omd && omd.logicalSensor && omd.logicalSensor.length) {
              const sensor = omd.logicalSensor.find((x) => x.productName === 'Temp/Hum');
              if (sensor && sensor.sensorDataType && sensor.sensorDataType.length) {
                const avgData = sensor.sensorDataType.find(
                  (x) => x.sensorDataName === '10 Min Avg Wind Speed'
                );
                if (avgData && avgData.dataValue)
                  windAverage = Math.round(avgData.dataValue * 1.609 * 10) / 10; // convert from mph

                const gustData = sensor.sensorDataType.find(
                  (x) => x.sensorDataName === '10 Min High Wind Speed'
                );
                if (gustData && gustData.dataValue)
                  windGust = Math.round(gustData.dataValue * 1.609 * 10) / 10;

                const bearingData = sensor.sensorDataType.find(
                  (x) => x.sensorDataName === '10 Min Scalar Avg Wind Direction'
                );
                if (bearingData && bearingData.dataValue) windBearing = bearingData.dataValue;

                const tempData = sensor.sensorDataType.find((x) => x.sensorDataName === 'Temp');
                if (tempData && tempData.dataValue)
                  temperature = Math.round((((tempData.dataValue - 32) * 5) / 9) * 10) / 10; // convert from F
              }
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch (error) {
          logger.warn(
            `An error occured while fetching data for weatherlink - ${station.externalId}`,
            {
              service: 'station',
              type: 'wl'
            }
          );

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
