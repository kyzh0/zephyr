import webpush from 'web-push';
import mongoose from 'mongoose';

import {
  PushSubscription,
  Station,
  StationData,
  logger,
  calculateWindAverage,
  getWindDirectionFromBearing,
  type WindDirection
} from '@zephyr/shared';

import { isTimestampFresh } from '@/lib/utils';

const DIRECTION_RANGES: Record<WindDirection, [number, number]> = {
  N: [337.5, 22.5],
  NE: [22.5, 67.5],
  E: [67.5, 112.5],
  SE: [112.5, 157.5],
  S: [157.5, 202.5],
  SW: [202.5, 247.5],
  W: [247.5, 292.5],
  NW: [292.5, 337.5]
};

function isBearingInDirection(bearing: number, direction: WindDirection): boolean {
  const [start, end] = DIRECTION_RANGES[direction];
  if (direction === 'N') {
    return (bearing >= start && bearing <= 360) || (bearing >= 0 && bearing < end);
  }

  return bearing >= start && bearing < end;
}

function formatSpeed(kmh: number, unit: 'kmh' | 'kt'): string {
  return unit === 'kt' ? `${Math.round(kmh / 1.852)} kt` : `${Math.round(kmh)} km/h`;
}

function initVapid(): boolean {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_CONTACT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_CONTACT) {
    return false;
  }
  webpush.setVapidDetails(VAPID_CONTACT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return true;
}

export async function processNotifications(): Promise<void> {
  if (!initVapid()) {
    logger.warn('VAPID keys not configured — skipping notification service', {
      service: 'notifications'
    });
    return;
  }

  const subscriptions = await PushSubscription.find({}).lean();
  if (!subscriptions.length) {
    return;
  }

  const uniqueStationIds = [
    ...new Set(subscriptions.flatMap((sub) => sub.rules.map((r) => r.stationId)))
  ];
  if (!uniqueStationIds.length) {
    return;
  }

  const objectIds = uniqueStationIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const stations = await Station.find({
    _id: { $in: objectIds },
    isDisabled: { $ne: true },
    isOffline: { $ne: true }
  }).lean();

  const stationMap = new Map(stations.map((s) => [s._id.toString(), s]));

  // Compute wind data per station: use currentAverage for standard, query StationData for hi-res
  const windMap = new Map<string, { average: number | null; bearing: number | null }>();

  for (const s of stations) {
    if (!isTimestampFresh(s.lastUpdate)) {
      continue;
    }

    if (!s.isHighResolution) {
      windMap.set(s._id.toString(), {
        average: s.currentAverage ?? null,
        bearing: s.currentBearing ?? null
      });
    }
  }

  const hiResStations = stations.filter(
    (s) => s.isHighResolution && isTimestampFresh(s.lastUpdate)
  );

  const hiResWindowFrom = new Date(Date.now() - 10 * 60 * 1000);
  const hiResResults = await Promise.all(
    hiResStations.map(async (s) => {
      const records = await StationData.find({
        station: s._id,
        time: { $gte: hiResWindowFrom }
      })
        .sort({ time: -1 })
        .lean();
      return { stationId: s._id.toString(), records };
    })
  );

  for (const { stationId, records } of hiResResults) {
    windMap.set(stationId, calculateWindAverage(records));
  }

  let count = 0;
  // Evaluate rules per subscription
  for (const sub of subscriptions) {
    const triggeredRuleIds: string[] = [];

    // Group triggered rules by station
    const triggeredByStation = new Map<
      string,
      { ruleIds: string[]; wind: { average: number; bearing: number }; stationName: string }
    >();

    for (const rule of sub.rules) {
      const wind = windMap.get(rule.stationId);
      if (!wind || wind.average == null || wind.bearing == null) {
        continue;
      }

      const meetsThreshold =
        rule.boundType === 'above'
          ? wind.average >= rule.threshold
          : wind.average <= rule.threshold;
      if (!meetsThreshold) {
        continue;
      }

      if (rule.directions.length > 0) {
        const meetsDirection = rule.directions.some((d) => isBearingInDirection(wind.bearing!, d));
        if (!meetsDirection) {
          continue;
        }
      }

      const station = stationMap.get(rule.stationId);
      if (!station?.name) {
        continue;
      }

      if (!triggeredByStation.has(rule.stationId)) {
        const stationName =
          station.name.length > 17 ? station.name.slice(0, 16) + '…' : station.name;
        triggeredByStation.set(rule.stationId, {
          ruleIds: [],
          wind: { average: wind.average, bearing: wind.bearing },
          stationName
        });
      }
      triggeredByStation.get(rule.stationId)!.ruleIds.push(rule.id);
    }

    for (const [stationId, { ruleIds, wind, stationName }] of triggeredByStation) {
      const directionLabel = getWindDirectionFromBearing(wind.bearing);
      const speedStr = formatSpeed(wind.average, sub.unit);

      const payload = JSON.stringify({
        title: 'Wind Alert',
        body: `${stationName}: ${speedStr} ${directionLabel}`,
        ruleIds,
        stationId,
        url: `/stations/${stationId}`
      });

      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload, {
          urgency: 'high',
          TTL: 1200
        });
        triggeredRuleIds.push(...ruleIds);
        count++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          await PushSubscription.deleteOne({ endpoint: sub.endpoint });
          logger.info(`Deleted expired push subscription`, { service: 'notifications' });
          break;
        }
        logger.error('Push send failed', { error: err, service: 'notifications' });
      }
    }

    // Remove triggered rules from server (one-shot)
    if (triggeredRuleIds.length > 0) {
      await PushSubscription.updateOne(
        { endpoint: sub.endpoint },
        { $pull: { rules: { id: { $in: triggeredRuleIds } } } }
      );
    }
  }

  logger.info(`Notified ${count} subscriptions`, { service: 'notifications' });
}

export async function resetAlertRules(): Promise<void> {
  const result = await PushSubscription.updateMany({}, { $set: { rules: [] } });
  logger.info(`Midnight reset: cleared rules for ${result.modifiedCount} subscriptions`, {
    service: 'notifications'
  });
}
