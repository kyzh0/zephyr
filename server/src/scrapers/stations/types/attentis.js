import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeAttentisData(stations) {
  try {
    const result = [];
    const { data } = await httpClient.get('https://api.attentistechnology.com/sensor-overview', {
      headers: { Authorization: `Bearer ${process.env.ATTENTIS_KEY}` }
    });
    if (data.data && data.data.weather_readings) {
      for (var key of Object.keys(data.data.weather_readings)) {
        const d = data.data.weather_readings[key];
        result.push({
          id: key,
          data: {
            windAverage: d.wind_speed,
            windGust: d.wind_gust_speed,
            windBearing: d.wind_direction,
            temperature: d.air_temp
          }
        });
      }
    }

    for (const station of stations) {
      const d = result.find((x) => x.id === station.externalId);
      if (d) {
        await processScrapedData(
          station,
          d.data.windAverage,
          d.data.windGust,
          d.data.windBearing,
          d.data.temperature
        );
      } else {
        logger.warn(`attentis error - no data for ${station.externalId}`, {
          service: 'station',
          type: 'attentis'
        });

        await processScrapedData(station, null, null, null, null, true);
      }
    }
  } catch (error) {
    logger.warn('attentis error', {
      service: 'station',
      type: 'attentis'
    });
    logger.warn(error);

    for (const station of stations) {
      await processScrapedData(station, null, null, null, null, true);
    }
  }
}
