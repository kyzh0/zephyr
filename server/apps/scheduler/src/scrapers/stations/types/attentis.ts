import { httpClient, logger, type StationAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

type AttentisReading = {
  wind_speed?: number | null;
  wind_gust_speed?: number | null;
  wind_direction?: number | null;
  air_temp?: number | null;
};

type AttentisResponse = {
  data?: {
    weather_readings?: Record<string, AttentisReading>;
  };
};

type StationResult = {
  id: string;
  data: {
    windAverage: number | null | undefined;
    windGust: number | null | undefined;
    windBearing: number | null | undefined;
    temperature: number | null | undefined;
  };
};

export default async function scrapeAttentisData(stations: WithId<StationAttrs>[]): Promise<void> {
  try {
    const result: StationResult[] = [];

    const attentisKey = process.env.ATTENTIS_KEY;
    const { data } = await httpClient.get<AttentisResponse>(
      'https://api.attentistechnology.com/sensor-overview',
      {
        headers: { Authorization: `Bearer ${attentisKey ?? ''}` }
      }
    );

    const readings = data.data?.weather_readings;
    if (readings) {
      for (const key of Object.keys(readings)) {
        const d = readings[key];
        result.push({
          id: key,
          data: {
            windAverage: d.wind_speed,
            windGust: d.wind_gust_speed,
            windBearing: d.wind_direction,
            temperature: d.air_temp
          }
        });
      }
    }

    for (const station of stations) {
      const d = result.find((x) => x.id === station.externalId);
      if (d) {
        await processScrapedData(
          station,
          d.data.windAverage ?? null,
          d.data.windGust ?? null,
          d.data.windBearing ?? null,
          d.data.temperature ?? null
        );
      } else {
        logger.warn(`attentis error - no data for ${station.externalId}`, {
          service: 'station',
          type: 'attentis'
        });

        await processScrapedData(station, null, null, null, null, true);
      }
    }
  } catch (error) {
    logger.warn('attentis error', { service: 'station', type: 'attentis' });

    const msg = error instanceof Error ? error.message : String(error);
    logger.warn(msg, { service: 'station', type: 'attentis' });

    for (const station of stations) {
      await processScrapedData(station, null, null, null, null, true);
    }
  }
}
