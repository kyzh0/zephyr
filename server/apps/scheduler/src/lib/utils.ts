const FRESHNESS_THRESHOLD_MS = 15 * 60 * 1000;

export function isTimestampFresh(timestamp?: Date | number | null, overrideMins?: number): boolean {
  if (timestamp == null) {
    return false;
  }
  if (timestamp instanceof Date && isNaN(timestamp.getTime())) {
    return false;
  }
  if (typeof timestamp === 'number' && !Number.isFinite(timestamp)) {
    return false;
  }

  const ms =
    timestamp instanceof Date
      ? timestamp.getTime()
      : timestamp < 1e10
        ? timestamp * 1000
        : timestamp;
  const threshold = overrideMins ? overrideMins * 60 * 1000 : FRESHNESS_THRESHOLD_MS;
  return Number.isFinite(ms) && Date.now() - ms < threshold;
}
