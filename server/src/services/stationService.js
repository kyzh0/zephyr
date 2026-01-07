import fs from 'fs/promises';
import { formatInTimeZone } from 'date-fns-tz';
import axios from 'axios';
import { getFlooredTime } from '../lib/utils.js';
import logger from '../lib/logger.js';

import { Station } from '../models/stationModel.js';
import { StationData } from '../models/stationDataModel.js';
import { Output } from '../models/outputModel.js';

function cmp(a, b) {
  if (a > b) {
    return +1;
  }
  if (a < b) {
    return -1;
  }
  return 0;
}
export async function processStationJson() {
  try {
    var date = getFlooredTime(10);
    const stations = await Station.find({ isDisabled: { $ne: true } }).lean();
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

    json.sort((a, b) => cmp(a.type, b.type) || cmp(a.name, b.name));
    const dir = `public/data/${formatInTimeZone(date, 'UTC', 'yyyy/MM/dd')}`;
    await fs.mkdir(dir, { recursive: true });
    const path = `${dir}/zephyr-scrape-${date.getTime() / 1000}.json`;
    await fs.writeFile(path, JSON.stringify(json));
    logger.info(`File created - ${path}`, { service: 'json' });

    const output = new Output({
      time: date,
      url: `${process.env.FILE_SERVER_PREFIX}/${path.replace('public/', '')}`
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
    const stations = await Station.find({
      isHighResolution: true,
      isDisabled: { $ne: true }
    }).lean();
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

    json.sort((a, b) => cmp(a.type, b.type) || cmp(a.name, b.name));
    const dir = `public/data/hr/${formatInTimeZone(date, 'UTC', 'yyyy/MM/dd')}`;
    await fs.mkdir(dir, { recursive: true });
    const path = `${dir}/zephyr-scrape-${date.getTime() / 1000}.json`;
    await fs.writeFile(path, JSON.stringify(json));
    logger.info(`File created - ${path}`, { service: 'json' });

    const output = new Output({
      time: date,
      url: `${process.env.FILE_SERVER_PREFIX}/${path.replace('public/', '')}`,
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

function groupBy(xs, key) {
  return xs.reduce(function (rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
}
export async function checkForErrors() {
  try {
    const stations = await Station.find({ isDisabled: { $ne: true } }).lean();
    if (!stations.length) {
      logger.error('No stations found.', { service: 'errors' });
      return;
    }

    const errors = [];
    const timeNow = Date.now();

    // check last 6h data
    const stationDataMap = await Promise.all(
      stations.map((station) =>
        StationData.find({
          station: station._id,
          time: { $gte: timeNow - 6 * 60 * 60 * 1000 }
        })
          .sort({ time: -1 })
          .lean()
          .then((data) => ({ station, data }))
      )
    );

    const newOfflineIds = [];
    const newErrorIds = [];
    for (const { station, data } of stationDataMap) {
      let isDataError = true;
      let isWindError = true;
      let isBearingError = true;
      let isTempError = true;

      if (data.length) {
        // check that data exists up to 60min before current time
        if (timeNow - new Date(data[0].time).getTime() <= 60 * 60 * 1000) {
          isDataError = false;
          for (const d of data) {
            if (d.windAverage != null || d.windGust != null) {
              isWindError = false;
            }
            if (d.windBearing != null) {
              isBearingError = false;
            }
            if (d.temperature != null) {
              isTempError = false;
            }
          }
        }
      }

      let errorMsg = '';
      if (isDataError) {
        errorMsg = 'ERROR: Data scraper has stopped.\n';
      } else if (isWindError) {
        errorMsg += 'ERROR: No wind avg/gust data.\n';
      }

      if (isDataError || isWindError) {
        if (!station.isOffline) {
          newOfflineIds.push(station._id);
          errors.push({
            type: station.type,
            msg: `${errorMsg}Name: ${station.name}\nURL: ${station.externalLink}\nDatabase ID: ${station._id}\n`
          });
        }
      }

      if (isDataError || isWindError || isBearingError || isTempError) {
        if (!station.isError) {
          newErrorIds.push(station._id);
        }
      }
    }

    // bulk db updates
    await Station.updateMany({ _id: { $in: newOfflineIds } }, { $set: { isOffline: true } });
    await Station.updateMany({ _id: { $in: newErrorIds } }, { $set: { isError: true } });

    if (errors.length) {
      // send email if >2 stations of the same type went offline simultaneously
      let msg = '';
      const g = groupBy(errors, 'type');
      const singleStations = [
        'lpc',
        'levin',
        'mpyc',
        'mfhb',
        'mrc',
        'wainui',
        'pw',
        'prime',
        'hw',
        'wswr',
        'sp',
        'wl'
      ];
      for (const [key, value] of Object.entries(g)) {
        if (singleStations.includes(key) || value.length > 2) {
          msg += `\n${key.toUpperCase()}\n\n`;
          msg += value.map((x) => x.msg).join('\n');
        }
      }
      if (msg.length) {
        await axios.post(`https://api.emailjs.com/api/v1.0/email/send`, {
          service_id: process.env.EMAILJS_SERVICE_ID,
          template_id: process.env.EMAILJS_TEMPLATE_ID,
          user_id: process.env.EMAILJS_PUBLIC_KEY,
          template_params: {
            message: `Scheduled check ran successfully at ${new Date().toISOString()}\n${msg}`
          },
          accessToken: process.env.EMAILJS_PRIVATE_KEY
        });
      }
    }

    logger.info(`Checked for errors - ${errors.length} stations newly offline.`, {
      service: 'errors'
    });
  } catch (error) {
    logger.error('An error occurred while checking for station errors', { service: 'errors' });
    logger.error(error, { service: 'errors' });
    return;
  }
}

export async function updateKeys() {
  try {
    // const harvestStations = await Station.find({
    //   type: 'harvest',
    //   harvestCookie: { $ne: null }
    // }).lean();
    // if (!harvestStations.length) {
    //   logger.error('Update keys: no harvest stations found.', { service: 'keys' });
    //   return;
    // }

    // if (harvestStations.length == 2) {
    //   const { headers } = await axios.post(
    //     'https://live.harvest.com/?sid=10243',
    //     {
    //       username: process.env.HARVEST_REALJOURNEYS_USERNAME,
    //       password: process.env.HARVEST_REALJOURNEYS_PASSWORD,
    //       submit: 'Login'
    //     },
    //     {
    //       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    //       maxRedirects: 0,
    //       validateStatus: (status) => status == 302
    //     }
    //   );

    //   const cookies = headers['set-cookie'];
    //   const regex = /PHPSESSID=[0-9a-zA-Z]+;\s/g;
    //   if (cookies && cookies.length && cookies[0] && cookies[0].match(regex)) {
    //     const cookie = cookies[0].slice(0, cookies[0].indexOf('; '));
    //     if (cookie) {
    //       await Station.updateMany(
    //         { _id: { $in: harvestStations.map((s) => s._id) } },
    //         { $set: { harvestCookie: cookie } }
    //       );
    //       logger.info('Keys updated: harvest', { service: 'keys' });
    //     }
    //   }
    // }

    const weatherlinkStations = await Station.find({
      type: 'wl',
      weatherlinkCookie: { $ne: null }
    }).lean();
    if (!weatherlinkStations.length) {
      logger.error('Update keys: no weatherlink stations found.', { service: 'keys' });
      return;
    }

    if (weatherlinkStations.length) {
      const { headers } = await axios.post(
        'https://www.weatherlink.com/processLogin',
        {
          username: process.env.WEATHERLINK_USERNAME,
          password: process.env.WEATHERLINK_PASSWORD
        },
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      const cookies = headers['set-cookie'];
      const regex = /JSESSIONID=[0-9a-zA-Z-]+;\s.*/g;
      if (cookies && cookies.length && cookies[0] && cookies[0].match(regex)) {
        const cookie = cookies[0].slice(0, cookies[0].indexOf('; '));
        if (cookie) {
          await Station.updateMany(
            { _id: { $in: weatherlinkStations.map((s) => s._id) } },
            { $set: { weatherlinkCookie: cookie } }
          );
          logger.info('Keys updated: weatherlink', { service: 'keys' });
        }
      }
    }
  } catch (error) {
    logger.error('An error occurred while updating keys', { service: 'keys' });
    logger.error(error.message, { service: 'keys' });
    return;
  }
}
