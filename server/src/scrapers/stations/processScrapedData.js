import { getFlooredTime } from '../../lib/utils.js';
import { validateStationData } from '../../validators/stationValidator.js';
import { Station } from '../../models/stationModel.js';
import logger from '../lib/log.js';

export async function processScrapedData(station, windAverage, windGust, windBearing, temperature) {
  const data = validateStationData(windAverage, windGust, windBearing, temperature);

  if (isNaN(data.windAverage)) data.windAverage = null;
  if (isNaN(data.windGust)) data.windGust = null;
  if (isNaN(data.windBearing)) data.windBearing = null;
  if (isNaN(data.temperature)) data.temperature = null;

  station.lastUpdate = new Date();
  station.currentAverage = data.windAverage ?? null;
  station.currentGust = data.windGust ?? null;
  station.currentBearing = data.windBearing ?? null;
  station.currentTemperature = data.temperature ?? null;

  if (data.windAverage != null || data.windGust != null) {
    station.isOffline = false;
  }
  if (
    data.windAverage != null &&
    data.windGust != null &&
    data.windBearing != null &&
    data.temperature != null
  ) {
    station.isError = false;
  }
  await station.save();

  // add data
  await Station.updateOne(
    { _id: station._id },
    {
      $push: {
        data: {
          time: getFlooredTime(10),
          windAverage: data.windAverage ?? null,
          windGust: data.windGust ?? null,
          windBearing: data.windBearing ?? null,
          temperature: data.temperature ?? null
        }
      }
    }
  );

  logger.info(
    `${station.type} data updated${station.externalId ? ` - ${station.externalId}` : ''}`,
    {
      service: 'station',
      type: station.type
    }
  );
}
