export function validateStationData(windAverage, windGust, windBearing, temperature) {
  let avg = windAverage;
  if (isNaN(avg) || avg < 0 || avg > 500) {
    avg = null;
  }
  let gust = windGust;
  if (isNaN(gust) || gust < 0 || gust > 500) {
    gust = null;
  }
  let bearing = windBearing;
  if (isNaN(bearing) || bearing < 0 || bearing > 360) {
    bearing = null;
  }
  let temp = temperature;
  if (isNaN(temperature) || temperature < -40 || temperature > 60) {
    temp = null;
  }

  return {
    windAverage: avg,
    windGust: gust,
    windBearing: bearing,
    temperature: temp
  };
}
