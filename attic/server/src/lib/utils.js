export function getWindBearingFromDirection(direction) {
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

export function getFlooredTime(interval) {
  // floor data timestamp to "interval" mins
  let date = new Date();
  let rem = date.getMinutes() % interval;
  if (rem > 0) {
    date = new Date(date.getTime() - rem * 60 * 1000);
  }
  rem = date.getSeconds() % 60;
  if (rem > 0) {
    date = new Date(date.getTime() - rem * 1000);
  }
  date = new Date(Math.floor(date.getTime() / 1000) * 1000);
  return date;
}
