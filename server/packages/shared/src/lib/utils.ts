export function calculateWindAverage(
  readings: { windAverage?: number | null; windBearing?: number | null }[]
): { average: number | null; bearing: number | null } {
  let count = 0;
  let sumAvg = 0;
  let sumBearingSin = 0;
  let sumBearingCos = 0;

  for (const r of readings) {
    if (r.windAverage != null && r.windBearing != null) {
      count++;
      sumAvg += r.windAverage;
      sumBearingSin += Math.sin((r.windBearing * Math.PI) / 180);
      sumBearingCos += Math.cos((r.windBearing * Math.PI) / 180);
    }
  }

  if (count === 0) {
    return { average: null, bearing: null };
  }

  const raw = Math.round((Math.atan2(sumBearingSin, sumBearingCos) * 180) / Math.PI);
  return {
    average: Math.round(sumAvg / count),
    bearing: raw < 0 ? raw + 360 : raw
  };
}

export function getWindDirectionFromBearing(bearing: number): string {
  if (bearing < 0) {
    return '';
  }
  if (bearing <= 11.25) {
    return 'N';
  }
  if (bearing <= 33.75) {
    return 'NNE';
  }
  if (bearing <= 56.25) {
    return 'NE';
  }
  if (bearing <= 78.75) {
    return 'ENE';
  }
  if (bearing <= 101.25) {
    return 'E';
  }
  if (bearing <= 123.75) {
    return 'ESE';
  }
  if (bearing <= 146.25) {
    return 'SE';
  }
  if (bearing <= 168.75) {
    return 'SSE';
  }
  if (bearing <= 191.25) {
    return 'S';
  }
  if (bearing <= 213.75) {
    return 'SSW';
  }
  if (bearing <= 236.25) {
    return 'SW';
  }
  if (bearing <= 258.75) {
    return 'WSW';
  }
  if (bearing <= 281.25) {
    return 'W';
  }
  if (bearing <= 303.75) {
    return 'WNW';
  }
  if (bearing <= 326.25) {
    return 'NW';
  }
  if (bearing <= 348.75) {
    return 'NNW';
  }
  return 'N';
}

export function getWindBearingFromDirection(direction?: string | null): number {
  if (!direction) {
    return 0;
  }

  switch (direction.trim().toUpperCase()) {
    case 'N':
      return 0;
    case 'NNE':
      return 22.5;
    case 'NE':
      return 45;
    case 'ENE':
      return 67.5;
    case 'E':
      return 90;
    case 'ESE':
      return 112.5;
    case 'SE':
      return 135;
    case 'SSE':
      return 157.5;
    case 'S':
      return 180;
    case 'SSW':
      return 202.5;
    case 'SW':
      return 225;
    case 'WSW':
      return 247.5;
    case 'W':
      return 270;
    case 'WNW':
      return 292.5;
    case 'NW':
      return 315;
    case 'NNW':
      return 337.5;
    default:
      return 0;
  }
}

export function isValidLonLat(coords: unknown): coords is [number, number] {
  if (!Array.isArray(coords) || coords.length !== 2) {
    return false;
  }
  const lon = Number(coords[0]);
  const lat = Number(coords[1]);
  return (
    Number.isFinite(lon) &&
    Number.isFinite(lat) &&
    lon >= -180 &&
    lon <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

export function getFlooredTime(interval: number): Date {
  if (!Number.isFinite(interval) || interval <= 0) {
    return new Date();
  }

  // floor data timestamp to "interval" mins
  let date = new Date();
  let rem = date.getMinutes() % interval;
  if (rem > 0) {
    date = new Date(date.getTime() - rem * 60 * 1000);
  }
  rem = date.getSeconds();
  if (rem > 0) {
    date = new Date(date.getTime() - rem * 1000);
  }
  date = new Date(Math.floor(date.getTime() / 1000) * 1000);
  return date;
}
