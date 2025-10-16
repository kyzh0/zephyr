import fs from 'fs/promises';
import { formatInTimeZone } from 'date-fns-tz';
import { getFlooredTime } from '../lib/utils.js';
import logger from '../lib/logger.js';

import { Station } from '../models/stationModel.js';
import { Output } from '../models/outputModel.js';

function cmp(a, b) {
  if (a > b) return +1;
  if (a < b) return -1;
  return 0;
}
export async function processStationJson() {
  try {
    var date = getFlooredTime(10);
    const stations = await Station.find({ isDisabled: { $ne: true } }, { data: 0 });
    const json = [];
    for (const s of stations) {
      let avg = s.currentAverage;
      let gust = s.currentGust;
      let bearing = s.currentBearing;
      let temp = s.currentTemperature;

      if (Date.now() - new Date(s.lastUpdate).getTime() > 10 * 60 * 1000) {
        avg = null;
        gust = null;
        bearing = null;
        temp = null;
      }

      json.push({
        id: s._id,
        name: s.name,
        type: s.type,
        elevation: s.elevation,
        coordinates: {
          lat: s.location.coordinates[1],
          lon: s.location.coordinates[0]
        },
        timestamp: date.getTime() / 1000,
        wind: {
          average: avg,
          gust: gust,
          bearing: bearing
        },
        temperature: temp
      });
    }

    json.sort((a, b) => {
      return cmp(a.type, b.type) || cmp(a.name, b.name);
    });
    const dir = `public/data/${formatInTimeZone(date, 'UTC', 'yyyy/MM/dd')}`;
    await fs.mkdir(dir, { recursive: true });
    const path = `${dir}/zephyr-scrape-${date.getTime() / 1000}.json`;
    await fs.writeFile(path, JSON.stringify(json));
    logger.info(`File created - ${path}`, { service: 'json' });

    const urlPrefix =
      process.env.NODE_ENV === 'production' ? 'https://fs.zephyrapp.nz/' : 'http://localhost:5000/';
    const output = new Output({
      time: date,
      url: `${urlPrefix}${path.replace('public/', '')}`
    });
    await output.save();
  } catch (error) {
    logger.error('An error occurred while processing json output', { service: 'json' });
    logger.error(error, { service: 'json' });
  }
}

export async function processHighResolutionStationJson() {
  try {
    var date = getFlooredTime(2);
    const stations = await Station.find(
      { isHighResolution: true, isDisabled: { $ne: true } },
      { data: 0 }
    );
    const json = [];
    for (const s of stations) {
      let avg = s.currentAverage;
      let gust = s.currentGust;
      let bearing = s.currentBearing;
      let temp = s.currentTemperature;

      if (Date.now() - new Date(s.lastUpdate).getTime() > 2 * 60 * 1000) {
        avg = null;
        gust = null;
        bearing = null;
        temp = null;
      }

      json.push({
        id: s._id,
        name: s.name,
        type: s.type,
        elevation: s.elevation,
        coordinates: {
          lat: s.location.coordinates[1],
          lon: s.location.coordinates[0]
        },
        timestamp: date.getTime() / 1000,
        wind: {
          average: avg,
          gust: gust,
          bearing: bearing
        },
        temperature: temp
      });
    }

    json.sort((a, b) => {
      return cmp(a.type, b.type) || cmp(a.name, b.name);
    });
    const dir = `public/data/hr/${formatInTimeZone(date, 'UTC', 'yyyy/MM/dd')}`;
    await fs.mkdir(dir, { recursive: true });
    const path = `${dir}/zephyr-scrape-${date.getTime() / 1000}.json`;
    await fs.writeFile(path, JSON.stringify(json));
    logger.info(`File created - ${path}`, { service: 'json' });

    const urlPrefix =
      process.env.NODE_ENV === 'production' ? 'https://fs.zephyrapp.nz/' : 'http://localhost:5000/';
    const output = new Output({
      time: date,
      url: `${urlPrefix}${path.replace('public/', '')}`,
      isHighResolution: true
    });
    await output.save();
  } catch (error) {
    logger.error('An error occurred while processing high resolution json output', {
      service: 'json'
    });
    logger.error(error, { service: 'json' });
  }
}
