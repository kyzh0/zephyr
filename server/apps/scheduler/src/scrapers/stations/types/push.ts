import {
  getFlooredTime,
  logger,
  PushReading,
  type PushReadingAttrs,
  type StationAttrs,
  type WithId
} from '@zephyr/shared';
import processScrapedData from '../processScrapedData';
import { validateStationData } from '@/validators/stationValidator';

const BUCKET_MINS = 2;

function mean(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function circularMean(bearings: number[]): number | null {
  if (!bearings.length) {
    return null;
  }

  let sin = 0;
  let cos = 0;
  for (const b of bearings) {
    sin += Math.sin((b * Math.PI) / 180);
    cos += Math.cos((b * Math.PI) / 180);
  }

  // also normalises -0 when the mean rounds to north from the west side
  return (Math.round((Math.atan2(sin, cos) * 180) / Math.PI) + 360) % 360;
}

// collapse however many readings arrived in the bucket into a single row:
// mean avg/temp, peak gust, circular mean bearing
function aggregate(readings: PushReadingAttrs[]) {
  const avgs: number[] = [];
  const gusts: number[] = [];
  const bearings: number[] = [];
  const temps: number[] = [];

  for (const r of readings) {
    const v = validateStationData(r.windAverage, r.windGust, r.windBearing, r.temperature);
    if (v.windAverage != null) {
      avgs.push(v.windAverage);
    }
    if (v.windGust != null) {
      gusts.push(v.windGust);
    }
    if (v.windBearing != null) {
      bearings.push(v.windBearing);
    }
    if (v.temperature != null) {
      temps.push(v.temperature);
    }
  }

  // senders reporting a single speed value: treat the peak as the gust
  const gustSource = gusts.length ? gusts : avgs;

  return {
    windAverage: mean(avgs),
    windGust: gustSource.length ? Math.max(...gustSource) : null,
    windBearing: circularMean(bearings),
    temperature: mean(temps)
  };
}

export default async function scrapePushData(stations: WithId<StationAttrs>[]): Promise<void> {
  // label the row with the bucket end, matching what other scrapers do for "current" data.
  // computed once so the query window and saved time can't straddle a boundary.
  const bucket = getFlooredTime(BUCKET_MINS);
  const from = new Date(bucket.getTime() - BUCKET_MINS * 60 * 1000);

  const readings = await PushReading.find({
    station: { $in: stations.map((s) => s._id) },
    receivedAt: { $gte: from, $lt: bucket }
  }).lean();

  const byStation = new Map<string, PushReadingAttrs[]>();
  for (const r of readings) {
    const key = r.station.toString();
    const list = byStation.get(key) ?? [];
    list.push(r);
    byStation.set(key, list);
  }

  await Promise.allSettled(
    stations.map(async (station) => {
      const stationReadings = byStation.get(station._id.toString()) ?? [];

      if (!stationReadings.length) {
        logger.warn(`push no data - ${station.name}`, { service: 'station', type: 'push' });
        await processScrapedData(station, null, null, null, null, true, bucket);
        return;
      }

      const { windAverage, windGust, windBearing, temperature } = aggregate(stationReadings);
      await processScrapedData(
        station,
        windAverage,
        windGust,
        windBearing,
        temperature,
        false,
        bucket
      );
    })
  );
}
