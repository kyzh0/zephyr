export type ValidatedStationData = {
  windAverage: number | null;
  windGust: number | null;
  windBearing: number | null;
  temperature: number | null;
};

export function validateStationData(
  windAverage?: number | null,
  windGust?: number | null,
  windBearing?: number | null,
  temperature?: number | null
): ValidatedStationData {
  let avg: number | null = windAverage ?? null;
  if (avg == null || Number.isNaN(avg) || avg < 0 || avg > 500) {
    avg = null;
  }

  let gust: number | null = windGust ?? null;
  if (gust == null || Number.isNaN(gust) || gust < 0 || gust > 500) {
    gust = null;
  }

  let bearing: number | null = windBearing ?? null;
  if (bearing == null || Number.isNaN(bearing) || bearing < 0 || bearing > 360) {
    bearing = null;
  }

  let temp: number | null = temperature ?? null;
  if (temp == null || Number.isNaN(temp) || temp < -40 || temp > 60) {
    temp = null;
  }

  return {
    windAverage: avg,
    windGust: gust,
    windBearing: bearing,
    temperature: temp
  };
}
