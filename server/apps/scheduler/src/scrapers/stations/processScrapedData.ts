import {
  logger,
  getFlooredTime,
  Station,
  StationData,
  type StationAttrs,
  type WithId
} from '@zephyr/shared';
import { validateStationData } from '@/validators/stationValidator';

export default async function processScrapedData(
  station: WithId<StationAttrs>,
  windAverage: number | null,
  windGust: number | null,
  windBearing: number | null,
  temperature: number | null,
  suppressLog?: boolean
): Promise<void> {
  const data = validateStationData(
    windAverage ?? null,
    windGust ?? null,
    windBearing ?? null,
    temperature ?? null
  );

  const lastUpdate = new Date();
  const currentAverage = data.windAverage ?? null;
  const currentGust = data.windGust ?? null;
  const currentBearing = data.windBearing ?? null;
  const currentTemperature = data.temperature ?? null;

  // add data
  const d = new StationData({
    time: getFlooredTime(station.isHighResolution ? 2 : 10),
    windAverage: data.windAverage ?? null,
    windGust: data.windGust ?? null,
    windBearing: data.windBearing ?? null,
    temperature: data.temperature ?? null,
    station: station._id
  });
  await d.save();

  // save station flags
  const updates = {
    lastUpdate: lastUpdate,
    currentAverage: currentAverage,
    currentGust: currentGust,
    currentBearing: currentBearing,
    currentTemperature: currentTemperature
  } as Partial<StationAttrs>;

  if (data.windAverage != null || data.windGust != null) {
    updates.isOffline = false;
  }
  if (
    data.windAverage != null &&
    data.windGust != null &&
    data.windBearing != null &&
    data.temperature != null
  ) {
    updates.isError = false;
  }

  await Station.updateOne(
    { _id: station._id, __v: station.__v },
    {
      $set: updates,
      $inc: { __v: 1 }
    }
  );

  if (!suppressLog) {
    logger.info(
      `${station.type} data updated${station.externalId ? ` - ${station.externalId}` : ''}`,
      { service: 'station', type: station.type }
    );
  }
}
