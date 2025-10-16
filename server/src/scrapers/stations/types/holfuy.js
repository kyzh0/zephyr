import pLimit from 'p-limit';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/log.js';

export default async function scrapeHolfuyData(stations) {
  try {
    // bulk scrape
    const { data } = await httpClient.get(
      `https://api.holfuy.com/live/?pw=${process.env.HOLFUY_KEY}&m=JSON&tu=C&su=km/h&s=all`
    );

    const individualScrapeStations = [];
    for (const station of stations) {
      const d = data.measurements.find((x) => x.stationId.toString() === station.externalId);
      if (d) {
        await processScrapedData(
          station,
          d.wind?.speed,
          d.wind?.gust,
          d.wind?.direction,
          d.temperature
        );
      } else {
        individualScrapeStations.push(station);
      }
    }

    // individual scrape
    if (individualScrapeStations.length) {
      const limit = pLimit(10);
      await Promise.allSettled(
        individualScrapeStations.map((station) => limit(scrapeHolfuyStation(station)))
      );
    }
  } catch (error) {
    logger.warn('An error occured while fetching data for holfuy API', {
      service: 'station',
      type: 'holfuy'
    });
    logger.warn(error);

    // try individually
    const limit = pLimit(10);
    await Promise.allSettled(stations.map((station) => limit(scrapeHolfuyStation(station))));
  }
}

async function scrapeHolfuyStation(station) {
  try {
    let windAverage = null;
    let windGust = null;
    let windBearing = null;
    let temperature = null;

    const { headers } = await httpClient.get(`https://holfuy.com/en/weather/${station.externalId}`);
    const cookies = headers['set-cookie'];
    if (cookies && cookies.length && cookies[0]) {
      const { data } = await httpClient.get(
        `https://holfuy.com/puget/mjso.php?k=${station.externalId}`,
        {
          headers: {
            Cookie: cookies[0]
          }
        }
      );

      if (data) {
        windAverage = data.speed;
        windGust = data.gust;
        windBearing = data.dir;
        temperature = data.temperature;
      }
    }

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch (error) {
    logger.warn(`An error occured while fetching data for holfuy - ${station.externalId}`, {
      service: 'station',
      type: 'holfuy'
    });

    await processScrapedData(station, null, null, null, null, true);
  }
}
