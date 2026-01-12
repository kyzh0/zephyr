import pLimit from 'p-limit';
import https from 'node:https';
import axios from 'axios';

import processScrapedData from '@/scrapers/stations/processScrapedData';
import logger from '@/lib/logger';

import type { StationAttrs } from '@/models/stationModel';
import type { WithId } from '@/types/mongoose';

type HilltopPoint = { t: string; v: string | number };
type HilltopResponse = { Data?: HilltopPoint[] };

// check data is less than 40 mins old
function getFreshValue(point: HilltopPoint | undefined): number | null {
  if (!point?.t) return null;
  const lastUpdate = new Date(point.t);
  if (Number.isNaN(lastUpdate.getTime()) || Date.now() - lastUpdate.getTime() >= 40 * 60 * 1000) {
    return null;
  }
  return Number(point.v);
}

export default async function scrapeHbrcData(stations: WithId<StationAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage: number | null = null;
          let windGust: number | null = null;
          let windBearing: number | null = null;
          let temperature: number | null = null;

          // ignore 'invalid' self-signed cert
          const agent = new https.Agent({
            rejectUnauthorized: false,
            requestCert: false
          });

          // avg
          let { data } = await axios.get<HilltopResponse>(
            `https://data.hbrc.govt.nz/Envirodata/EMAR.hts?Service=Hilltop&Request=GetData&Site=${station.externalId}&Measurement=Average%20Wind%20Speed&Format=JSON`,
            { httpsAgent: agent }
          );
          windAverage = getFreshValue(data?.Data?.[0]);

          // gust
          ({ data } = await axios.get<HilltopResponse>(
            `https://data.hbrc.govt.nz/Envirodata/EMAR.hts?Service=Hilltop&Request=GetData&Site=${station.externalId}&Measurement=Maximum%20Wind%20Speed&Format=JSON`,
            { httpsAgent: agent }
          ));
          windGust = getFreshValue(data?.Data?.[0]);

          // direction
          ({ data } = await axios.get<HilltopResponse>(
            `https://data.hbrc.govt.nz/Envirodata/EMAR.hts?Service=Hilltop&Request=GetData&Site=${station.externalId}&Measurement=Average%20Wind%20Direction&Format=JSON`,
            { httpsAgent: agent }
          ));
          windBearing = getFreshValue(data?.Data?.[0]);

          // temperature
          ({ data } = await axios.get<HilltopResponse>(
            `https://data.hbrc.govt.nz/Envirodata/EMAR.hts?Service=Hilltop&Request=GetData&Site=${station.externalId}&Measurement=Average%20Air%20Temperature&Format=JSON`,
            { httpsAgent: agent }
          ));
          temperature = getFreshValue(data?.Data?.[0]);

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch {
          logger.warn(`hbrc error - ${station.externalId}`, {
            service: 'station',
            type: 'hbrc'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
