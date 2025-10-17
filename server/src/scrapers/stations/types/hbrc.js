import pLimit from 'p-limit';
import https from 'https';
import axios from 'axios';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapeHbrcData(stations) {
  const limit = pLimit(10);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage = null;
          let windGust = null;
          let windBearing = null;
          let temperature = null;

          // ignore 'invalid' self-signed cert
          const agent = new https.Agent({
            rejectUnauthorized: false,
            requestCert: false,
            agent: false
          });

          // avg
          let { data } = await axios.get(
            `https://data.hbrc.govt.nz/Envirodata/EMAR.hts?Service=Hilltop&Request=GetData&Site=${station.externalId}&Measurement=Average%20Wind%20Speed&Format=JSON`,
            {
              httpsAgent: agent
            }
          );

          if (data && data.Data && data.Data.length) {
            // ignore old data
            const lastUpdate = new Date(data.Data[0].t);
            if (Date.now() - lastUpdate.getTime() < 40 * 60 * 1000) {
              windAverage = Number(data.Data[0].v);
            }
          }

          // gust
          ({ data } = await axios.get(
            `https://data.hbrc.govt.nz/Envirodata/EMAR.hts?Service=Hilltop&Request=GetData&Site=${station.externalId}&Measurement=Maximum%20Wind%20Speed&Format=JSON`,
            {
              httpsAgent: agent
            }
          ));

          if (data && data.Data && data.Data.length) {
            const lastUpdate = new Date(data.Data[0].t);
            if (Date.now() - lastUpdate.getTime() < 40 * 60 * 1000) {
              windGust = Number(data.Data[0].v);
            }
          }

          // direction
          ({ data } = await axios.get(
            `https://data.hbrc.govt.nz/Envirodata/EMAR.hts?Service=Hilltop&Request=GetData&Site=${station.externalId}&Measurement=Average%20Wind%20Direction&Format=JSON`,
            {
              httpsAgent: agent
            }
          ));

          if (data && data.Data && data.Data.length) {
            const lastUpdate = new Date(data.Data[0].t);
            if (Date.now() - lastUpdate.getTime() < 40 * 60 * 1000) {
              windBearing = Number(data.Data[0].v);
            }
          }

          // temperature
          ({ data } = await axios.get(
            `https://data.hbrc.govt.nz/Envirodata/EMAR.hts?Service=Hilltop&Request=GetData&Site=${station.externalId}&Measurement=Average%20Air%20Temperature&Format=JSON`,
            {
              httpsAgent: agent
            }
          ));

          if (data && data.Data && data.Data.length) {
            const lastUpdate = new Date(data.Data[0].t);
            if (Date.now() - lastUpdate.getTime() < 40 * 60 * 1000) {
              temperature = Number(data.Data[0].v);
            }
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch (error) {
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
