import pLimit from 'p-limit';
import { formatInTimeZone } from 'date-fns-tz';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/log.js';

export default async function scrapeWowData(stations) {
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
            `https://wow.metoffice.gov.uk/observations/details/tableviewdata/${station.externalId}/details/${formatInTimeZone(new Date(), 'UTC', 'yyyy-MM-dd')}`
          );
          if (data.Observations && data.Observations.length) {
            const d = data.Observations[0];
            if (d) {
              const time = new Date(d.ReportEndDateTime);
              // only update if data is <15min old
              if (Date.now() - time.getTime() < 15 * 60 * 1000) {
                windAverage = d.windSpeed_MetrePerSecond * 3.6;
                windGust = d.windGust_MetrePerSecond * 3.6;
                windBearing = d.windDirection;
                temperature = d.dryBulbTemperature_Celsius;
              }
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch (error) {
          logger.warn(`An error occured while fetching data for wow - ${station.externalId}`, {
            service: 'station',
            type: 'wow'
          });
        }
      })
    )
  );
}
