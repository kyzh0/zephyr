import { getFlooredTime } from '@/lib/utils';
import { validateStationData } from '@/validators/stationValidator';
import { Station } from '@/models/stationModel';
import { StationData } from '@/models/stationDataModel';
import logger from '@/lib/logger';

import type { StationAttrs } from '@/models/stationModel';
import type { WithId } from '@/types/mongoose';

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

  station.lastUpdate = new Date();
  station.currentAverage = data.windAverage ?? null;
  station.currentGust = data.windGust ?? null;
  station.currentBearing = data.windBearing ?? null;
  station.currentTemperature = data.temperature ?? null;

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

  await Station.updateOne(
    { _id: station._id },
    {
      lastUpdate: station.lastUpdate,
      currentAverage: station.currentAverage,
      currentGust: station.currentGust,
      currentBearing: station.currentBearing,
      currentTemperature: station.currentTemperature,
      isOffline: station.isOffline,
      isError: station.isError
    }
  );

  if (!suppressLog) {
    logger.info(
      `${station.type} data updated${station.externalId ? ` - ${station.externalId}` : ''}`,
      { service: 'station', type: station.type }
    );
  }
}
