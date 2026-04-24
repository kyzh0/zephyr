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

export async function runNotificationService(): Promise<void> {
  if (!initVapid()) {
    logger.warn('VAPID keys not configured — skipping notification service', {
      service: 'notifications'
    });
    return;
  }

  logger.info('--- Notification service start ---', { service: 'notifications' });

  const now = Date.now();

  const subscriptions = await PushSubscription.find({}).lean();
  if (!subscriptions.length) {
    return;
  }

  // Collect unique station IDs from non-expired rules across all subscriptions
  const activeRules = subscriptions.flatMap((sub) =>
    sub.rules.filter((r) => r.enabledAt + r.activeHours * 3_600_000 > now)
  );

  const uniqueStationIds = [...new Set(activeRules.map((r) => r.stationId))];
  if (!uniqueStationIds.length) {
    return;
  }

  const objectIds = uniqueStationIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const stations = await Station.find({
    _id: { $in: objectIds },
    isDisabled: false,
    isOffline: false
  }).lean();

  const stationMap = new Map(stations.map((s) => [s._id.toString(), s]));

  // Compute wind data per station: use currentAverage for standard, query StationData for hi-res
  const windMap = new Map<string, { average: number | null; bearing: number | null }>();

  for (const s of stations) {
    if (!s.isHighResolution) {
      windMap.set(s._id.toString(), {
        average: s.currentAverage ?? null,
        bearing: s.currentBearing ?? null
      });
    }
  }

  const hiResStations = stations.filter((s) => s.isHighResolution);

  const hiResResults = await Promise.all(
    hiResStations.map(async (s) => {
      const records = await StationData.find({ station: s._id }).sort({ time: -1 }).limit(5).lean();
      return { stationId: s._id.toString(), records };
    })
  );

  for (const { stationId, records } of hiResResults) {
    windMap.set(stationId, calculateWindAverage(records));
  }

  // Evaluate rules per subscription
  for (const sub of subscriptions) {
    const triggeredRuleIds: string[] = [];

    for (const rule of sub.rules) {
      if (rule.enabledAt + rule.activeHours * 3_600_000 <= now) {
        continue;
      }

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
      if (!station || !station.name) {
        continue;
      }

      const directionLabel = getWindDirectionFromBearing(wind.bearing);
      const speedStr = formatSpeed(wind.average, sub.unit);

      const payload = JSON.stringify({
        title: 'Wind Alert',
        body: `${station.name}: ${speedStr} ${directionLabel}`,
        ruleId: rule.id,
        stationId: rule.stationId,
        url: `/stations/${rule.stationId}`
      });

      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
        triggeredRuleIds.push(rule.id);
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

  logger.info('--- Notification service end ---', { service: 'notifications' });
}
