import { httpClient } from '../../../lib/httpClient.js';
import logger from '../../../lib/log.js';
import { getWindBearingFromDirection } from '../../../lib/utils.js';
import { processScrapedData } from '../processScrapedData.js';

export default async function getMetserviceData(station) {
  try {
    let windAverage = null;
    let windGust = null;
    let windBearing = null;
    let temperature = null;

    const { data } = await httpClient.get(
      `https://www.metservice.com/publicData/webdata/module/weatherStationCurrentConditions/${station.externalId}`
    );
    const wind = data.observations.wind;
    if (wind && wind.length && wind[0]) {
      windAverage = wind[0].averageSpeed;
      windGust = wind[0].gustSpeed;

      if (wind[0].strength === 'Calm') {
        if (windAverage == null) {
          windAverage = 0;
        }
        if (windGust == null) {
          windGust = 0;
        }
      }

      windBearing = getWindBearingFromDirection(wind[0].direction);
    }

    const temp = data.observations.temperature;
    if (temp && temp.length && temp[0]) {
      temperature = temp[0].current;
    }

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch (error) {
    logger.warn(`An error occured while fetching data for metservice - ${station.externalId}`, {
      service: 'station',
      type: 'metservice'
    });
  }
}
