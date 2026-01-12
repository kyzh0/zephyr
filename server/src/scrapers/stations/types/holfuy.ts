import pLimit from 'p-limit';

import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/stations/processScrapedData';
import logger from '@/lib/logger';

import type { StationAttrs } from '@/models/stationModel';
import type { WithId } from '@/types/mongoose';

type HolfuyBulkMeasurement = {
  stationId: string | number;
  wind?: {
    speed?: number | null;
    gust?: number | null;
    direction?: number | null;
  };
  temperature?: number | null;
};

type HolfuyBulkResponse = {
  measurements: HolfuyBulkMeasurement[];
};

type HolfuyStationResponse = {
  speed?: number | null;
  gust?: number | null;
  dir?: number | null;
  temperature?: number | null;
};

export default async function scrapeHolfuyData(stations: WithId<StationAttrs>[]): Promise<void> {
  try {
    // bulk scrape
    const { data } = await httpClient.get<HolfuyBulkResponse>(
      `https://api.holfuy.com/live/?pw=${process.env.HOLFUY_KEY}&m=JSON&tu=C&su=km/h&s=all`
    );

    const individualScrapeStations: WithId<StationAttrs>[] = [];

    for (const station of stations) {
      const d = data.measurements.find((x) => x.stationId.toString() === station.externalId);

      if (d) {
        await processScrapedData(
          station,
          d.wind?.speed ?? null,
          d.wind?.gust ?? null,
          d.wind?.direction ?? null,
          d.temperature ?? null
        );
      } else {
        individualScrapeStations.push(station);
      }
    }

    // individual scrape
    if (individualScrapeStations.length) {
      const limit = pLimit(5);
      await Promise.allSettled(
        individualScrapeStations.map((station) => limit(() => scrapeHolfuyStation(station)))
      );
    }
  } catch (error) {
    logger.warn('holfuy API error', { service: 'station', type: 'holfuy' });

    const msg = error instanceof Error ? error.message : String(error);
    logger.warn(msg, { service: 'station', type: 'holfuy' });

    // try individually
    const limit = pLimit(5);
    await Promise.allSettled(stations.map((station) => limit(() => scrapeHolfuyStation(station))));
  }
}

async function scrapeHolfuyStation(station: WithId<StationAttrs>): Promise<void> {
  try {
    let windAverage: number | null = null;
    let windGust: number | null = null;
    let windBearing: number | null = null;
    let temperature: number | null = null;

    const { headers } = await httpClient.get(`https://holfuy.com/en/weather/${station.externalId}`);

    const cookies = headers['set-cookie'];
    if (cookies?.length && cookies[0]) {
      const { data } = await httpClient.get<HolfuyStationResponse>(
        `https://holfuy.com/puget/mjso.php?k=${station.externalId}`,
        { headers: { Cookie: cookies[0] } }
      );

      if (data) {
        windAverage = data.speed ?? null;
        windGust = data.gust ?? null;
        windBearing = data.dir ?? null;
        temperature = data.temperature ?? null;
      }
    }

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch {
    logger.warn(`holfuy error - ${station.externalId}`, {
      service: 'station',
      type: 'holfuy'
    });

    await processScrapedData(station, null, null, null, null, true);
  }
}
