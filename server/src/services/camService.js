import axios from 'axios';
import { parse } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import sharp from 'sharp';
import md5 from 'md5';
import fs from 'fs/promises';
import dir from 'node-dir';

import logger from '../helpers/log.js';

import { Cam } from '../models/camModel.js';

async function getHarvestImage(sid, hsn, lastUpdate) {
  let updated = null;
  let base64 = null;

  try {
    const { data } = await axios.get(
      `https://live.harvest.com/php/device_camera_images_functions.php?device_camera_images&request_type=initial&site_id=${sid}&hsn=${hsn}`,
      {
        headers: {
          Connection: 'keep-alive'
        }
      }
    );
    if (data.date_utc) {
      updated = new Date(data.date_utc);
      // skip if image already up to date
      if (updated > lastUpdate && data.main_image) {
        base64 = data.main_image.replace('\\/', '/').replace('data:image/jpeg;base64,', '');
      }
    }
  } catch (error) {
    logger.warn(`An error occured while fetching images for harvest - ${sid}`, {
      service: 'cam',
      type: 'harvest'
    });
  }

  return {
    updated,
    base64
  };
}

async function getMetserviceImage(id, lastUpdate) {
  let updated = null;
  let base64 = null;

  try {
    const { data } = await axios.get(
      `https://www.metservice.com/publicData/webdata/traffic-camera/${id}`,
      {
        headers: {
          Connection: 'keep-alive'
        }
      }
    );
    const modules = data.layout.secondary.slots.major.modules;
    if (modules && modules.length) {
      const sets = modules[0].sets;
      if (sets && sets.length) {
        const times = sets[0].times;
        if (times.length) {
          const d = times[times.length - 1];
          if (d.displayTime) {
            updated = new Date(d.displayTime);
            // skip if image already up to date
            if (updated > lastUpdate && d.url) {
              const response = await axios.get(`https://www.metservice.com${d.url}`, {
                responseType: 'arraybuffer',
                headers: {
                  Connection: 'keep-alive'
                }
              });
              base64 = Buffer.from(response.data, 'binary').toString('base64');
            }
          }
        }
      }
    }
  } catch (error) {
    logger.warn(`An error occured while fetching images for metservice - ${id}`, {
      service: 'cam',
      type: 'metservice'
    });
  }

  return {
    updated,
    base64
  };
}

async function getLakeWanakaImage(id, lastUpdate) {
  let updated = null;
  let base64 = null;

  try {
    const { data } = await axios.get(`https://api.lakewanaka.co.nz/webcam/feed/${id}`, {
      headers: {
        Connection: 'keep-alive'
      }
    });
    const d = data.latest_image;
    if (d && d.timestamp) {
      updated = fromZonedTime(
        parse(d.timestamp, 'yyyy-MM-dd HH:mm:ss', new Date()),
        'Pacific/Auckland'
      );
      // skip if image already up to date
      if (updated > lastUpdate && d.url) {
        const response = await axios.get(d.url, {
          responseType: 'arraybuffer',
          headers: {
            Connection: 'keep-alive'
          }
        });
        base64 = Buffer.from(response.data, 'binary').toString('base64');
      }
    }
  } catch (error) {
    logger.warn(`An error occured while fetching images for lake wanaka - ${id}`, {
      service: 'cam',
      type: 'lw'
    });
  }

  return {
    updated,
    base64
  };
}

async function getCheesemanImage(id, lastUpdate) {
  let updated = null;
  let base64 = null;

  try {
    const { data } = await axios.get(
      `https://www.mtcheeseman.co.nz/wp-content/webcam-player/?cam=${id}`,
      {
        headers: {
          Connection: 'keep-alive'
        }
      }
    );
    if (data.length) {
      const matches = data.match(/\/wp-content\/webcam\/aframe\/\d{4}-\d{2}-\d{2}\/\d{12}\.jpg/g);
      if (matches && matches.length) {
        const url = matches[matches.length - 1];
        const match = url.match(/\d{12}/g);
        updated = fromZonedTime(parse(match[0], 'yyyyMMddHHmm', new Date()), 'Pacific/Auckland');

        // skip if image already up to date
        if (updated > lastUpdate) {
          const response = await axios.get(`https://www.mtcheeseman.co.nz${url}`, {
            responseType: 'arraybuffer',
            headers: {
              Connection: 'keep-alive'
            }
          });
          base64 = Buffer.from(response.data, 'binary').toString('base64');
        }
      }
    }
  } catch (error) {
    logger.warn(`An error occured while fetching images for mt cheeseman - ${id}`, {
      service: 'cam',
      type: 'cm'
    });
  }

  return {
    updated,
    base64
  };
}

async function getQueenstownAirportImage(id) {
  let updated = null;
  let base64 = null;

  try {
    const dateTimeFormat = new Intl.DateTimeFormat('en-NZ', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      timeZone: 'Pacific/Auckland'
    });
    const parts = dateTimeFormat.formatToParts(new Date());

    let year = '';
    let month = '';
    let day = '';
    let hour = '';
    let minute = '';
    for (const p of parts) {
      switch (p.type) {
        case 'year':
          year = p.value;
          break;
        case 'month':
          month = p.value.padStart(2, '0');
          break;
        case 'day':
          day = p.value.padStart(2, '0');
          break;
        case 'hour':
          hour = p.value.padStart(2, '0');
          break;
        case 'minute':
          minute = p.value.padStart(2, '0');
          break;
      }
    }

    const response = await axios.get(
      `https://www.queenstownairport.co.nz/WebCam/${id}.jpg?dt=${year}-${month}-${day}-${hour}-${minute}`,
      {
        responseType: 'arraybuffer',
        headers: {
          Connection: 'keep-alive'
        }
      }
    );
    if (response.status == 200 && response.headers['content-type'] === 'image/jpeg') {
      base64 = Buffer.from(response.data, 'binary').toString('base64');
      updated = new Date();
    }
  } catch (error) {
    logger.warn(`An error occured while fetching images for qt airport - ${id}`, {
      service: 'cam',
      type: 'qa'
    });
  }

  return {
    updated,
    base64
  };
}

async function getWanakaAirportImage(id) {
  let updated = null;
  let base64 = null;

  try {
    const dateTimeFormat = new Intl.DateTimeFormat('en-NZ', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      timeZone: 'Pacific/Auckland'
    });
    const parts = dateTimeFormat.formatToParts(new Date());

    let year = '';
    let month = '';
    let day = '';
    let hour = '';
    let minute = '';
    for (const p of parts) {
      switch (p.type) {
        case 'year':
          year = p.value;
          break;
        case 'month':
          month = p.value.padStart(2, '0');
          break;
        case 'day':
          day = p.value.padStart(2, '0');
          break;
        case 'hour':
          hour = p.value.padStart(2, '0');
          break;
        case 'minute':
          minute = p.value.padStart(2, '0');
          break;
      }
    }

    const response = await axios.get(
      `https://www.wanakaairport.com/WebCam/${id}.jpg?dt=${year}-${month}-${day}-${hour}-${minute}`,
      {
        responseType: 'arraybuffer',
        headers: {
          Connection: 'keep-alive'
        }
      }
    );
    if (response.status == 200 && response.headers['content-type'] === 'image/jpeg') {
      base64 = Buffer.from(response.data, 'binary').toString('base64');
      updated = new Date();
    }
  } catch (error) {
    logger.warn(`An error occured while fetching images for wanaka airport - ${id}`, {
      service: 'cam',
      type: 'wa'
    });
  }

  return {
    updated,
    base64
  };
}

async function getCgcImage(id) {
  let updated = null;
  let base64 = null;

  try {
    const response = await axios.get(
      `https://canterburyglidingclub.nz/images/CGCHdCam${id}_1.jpg`,
      {
        responseType: 'arraybuffer',
        headers: {
          Connection: 'keep-alive'
        }
      }
    );
    base64 = Buffer.from(response.data, 'binary').toString('base64');
    updated = new Date();
  } catch (error) {
    logger.warn(`An error occured while fetching images for cgc - ${id}`, {
      service: 'cam',
      type: 'cgc'
    });
  }

  return {
    updated,
    base64
  };
}

async function getCastleHillImage(id) {
  let updated = null;
  let base64 = null;

  try {
    const response = await axios.get(
      `https://www.castlehill.nz/php/webcam_wll.php?cam=${id}/webcam.php.jpg`,
      {
        responseType: 'arraybuffer',
        headers: {
          Connection: 'keep-alive'
        }
      }
    );
    base64 = Buffer.from(response.data, 'binary').toString('base64');
    updated = new Date();
  } catch (error) {
    logger.warn(`An error occured while fetching images for castle hill - ${id}`, {
      service: 'cam',
      type: 'ch'
    });
  }

  return {
    updated,
    base64
  };
}

async function getCwuImage(id) {
  let updated = null;
  let base64 = null;

  try {
    const dateTimeFormat = new Intl.DateTimeFormat('en-NZ', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      timeZone: 'Pacific/Auckland'
    });
    const parts = dateTimeFormat.formatToParts(new Date());

    let year = '';
    let month = '';
    let day = '';
    let hour = '';
    let minute = '';
    let temp = 0;
    for (const p of parts) {
      switch (p.type) {
        case 'year':
          year = p.value.slice(2);
          break;
        case 'month':
          month = p.value.padStart(2, '0');
          break;
        case 'day':
          day = p.value.padStart(2, '0');
          break;
        case 'hour':
          hour = p.value.padStart(2, '0');
          break;
        case 'minute':
          temp = Number(p.value);
          temp = temp - (temp % 15);
          minute = temp.toString().padStart(2, '0');
          break;
      }
    }

    const response = await axios.get(
      `https://cwu.co.nz/temp/seeit-${id}-${day}-${month}-${year}-${hour}-${minute}.jpg`,
      {
        responseType: 'arraybuffer',
        headers: {
          Connection: 'keep-alive'
        }
      }
    );
    if (response.status == 200 && response.headers['content-type'] === 'image/jpeg') {
      base64 = Buffer.from(response.data, 'binary').toString('base64');
      updated = new Date();
    }
  } catch (error) {
    logger.warn(`An error occured while fetching images for cwu - ${id}`, {
      service: 'cam',
      type: 'cwu'
    });
  }

  return {
    updated,
    base64
  };
}

async function getArthursPassImage(id) {
  let updated = null;
  let base64 = null;

  try {
    const response = await axios.get(
      `https://www.arthurspass.com/webcams/webcam3.php?id=D&unique_id=${id}`,
      {
        responseType: 'arraybuffer',
        headers: {
          Connection: 'keep-alive'
        }
      }
    );
    base64 = Buffer.from(response.data, 'binary').toString('base64');
    updated = new Date();
  } catch (error) {
    logger.warn(`An error occured while fetching images for arthurs pass - ${id}`, {
      service: 'cam',
      type: 'ap'
    });
  }

  return {
    updated,
    base64
  };
}

async function getMtHuttImage(id) {
  let updated = null;
  let base64 = null;

  try {
    const { data } = await axios.get('https://www.mthutt.co.nz/weather-report/', {
      headers: {
        Connection: 'keep-alive'
      }
    });
    if (data.length) {
      let startStr = `/Webcams/MtHutt/SummitCamera/${id}/`;
      let i = data.lastIndexOf(startStr);
      if (i >= 0) {
        const j = data.indexOf('.jpg', i);
        if (j > i) {
          const response = await axios.get(
            `https://www.mthutt.co.nz${data.slice(i, j).trim()}.jpg`,
            {
              responseType: 'arraybuffer',
              headers: {
                Connection: 'keep-alive'
              }
            }
          );
          base64 = Buffer.from(response.data, 'binary').toString('base64');
          updated = new Date();
        }
      }
    }
  } catch (error) {
    logger.warn(`An error occured while fetching images for mt hutt - ${id}`, {
      service: 'cam',
      type: 'hutt'
    });
  }

  return {
    updated,
    base64
  };
}

async function getTaylorsSurfImage() {
  let updated = null;
  let base64 = null;

  try {
    const response = await axios.get('https://stream.webmad.co.nz/shots/taylorssouth2.jpg', {
      responseType: 'arraybuffer',
      headers: {
        Connection: 'keep-alive'
      }
    });
    base64 = Buffer.from(response.data, 'binary').toString('base64');
    updated = new Date();
  } catch (error) {
    logger.warn('An error occured while fetching images for taylors surf', {
      service: 'cam',
      type: 'ts'
    });
  }

  return {
    updated,
    base64
  };
}

async function getSnowgrassImage() {
  let updated = null;
  let base64 = null;

  try {
    const response = await axios.get('https://snowgrass.nz/cust/contact/clyde/images/webcam.jpg', {
      responseType: 'arraybuffer',
      headers: {
        Connection: 'keep-alive'
      }
    });
    base64 = Buffer.from(response.data, 'binary').toString('base64');
    updated = new Date();
  } catch (error) {
    logger.warn('An error occured while fetching images for snowgrass', {
      service: 'cam',
      type: 'snowgrass'
    });
  }

  return {
    updated,
    base64
  };
}

export async function webcamWrapper() {
  try {
    const cams = await Cam.find({});
    if (!cams.length) {
      logger.error('No webcams found.', { service: 'cam' });
      return null;
    }

    for (const c of cams) {
      let data = null;
      const lastUpdate = new Date(c.lastUpdate);

      if (c.type === 'harvest') {
        const ids = c.externalId.split('_');
        data = await getHarvestImage(ids[0], ids[1], lastUpdate);
      } else if (c.type === 'metservice') {
        data = await getMetserviceImage(c.externalId, lastUpdate);
      } else if (c.type === 'lw') {
        data = await getLakeWanakaImage(c.externalId, lastUpdate);
      } else if (c.type === 'cm') {
        data = await getCheesemanImage(c.externalId, lastUpdate);
      } else if (c.type === 'qa') {
        data = await getQueenstownAirportImage(c.externalId);
      } else if (c.type === 'wa') {
        data = await getWanakaAirportImage(c.externalId);
      } else if (c.type === 'cgc') {
        data = await getCgcImage(c.externalId);
      } else if (c.type === 'ch') {
        data = await getCastleHillImage(c.externalId);
      } else if (c.type === 'cwu') {
        data = await getCwuImage(c.externalId);
      } else if (c.type === 'ap') {
        data = await getArthursPassImage(c.externalId);
      } else if (c.type === 'hutt') {
        data = await getMtHuttImage(c.externalId);
      } else if (c.type === 'ts') {
        data = await getTaylorsSurfImage();
      } else if (c.type === 'snowgrass') {
        data = await getSnowgrassImage();
      }

      try {
        if (data && data.updated && data.base64) {
          const imgBuff = Buffer.from(data.base64, 'base64');

          const img = {
            time: data.updated
          };

          // for types that don't have embedded timestamps, check for duplicate image
          if (
            c.type === 'qa' ||
            c.type === 'wa' ||
            c.type === 'cgc' ||
            c.type === 'ch' ||
            c.type === 'cwu' ||
            c.type === 'ap' ||
            c.type === 'hutt' ||
            c.type === 'ts' ||
            c.type === 'snowgrass'
          ) {
            img.hash = md5(imgBuff);
            img.fileSize = imgBuff.length;

            if (c.images.length) {
              const latestImg = c.images.reduce((prev, current) => {
                return prev && new Date(prev.time) > new Date(current.time) ? prev : current;
              });
              if (latestImg && latestImg.fileSize == img.fileSize && latestImg.hash == img.hash) {
                logger.info(
                  `${c.type} image update skipped${c.externalId ? ` - ${c.externalId}` : ''}`,
                  { service: 'cam', type: c.type }
                );
                continue;
              }
            }
          }

          const dir = `public/cams/${c.type}/${c._id}`;
          await fs.mkdir(dir, { recursive: true });

          const resizedBuf = await sharp(imgBuff).resize({ width: 600 }).toBuffer();
          const path = `${dir}/${data.updated.toISOString()}.jpg`;
          await fs.writeFile(path, resizedBuf);

          img.url = path.replace('public/', '');

          // update cam
          c.lastUpdate = new Date();
          c.currentTime = data.updated;
          c.currentUrl = img.url;
          await c.save();

          // add image
          await Cam.updateOne(
            { _id: c._id },
            {
              $push: {
                images: img
              }
            }
          );

          logger.info(`${c.type} image updated${c.externalId ? ` - ${c.externalId}` : ''}`, {
            service: 'cam',
            type: c.type
          });
        } else {
          logger.info(`${c.type} image update skipped${c.externalId ? ` - ${c.externalId}` : ''}`, {
            service: 'cam',
            type: c.type
          });
        }
      } catch (error) {
        logger.error(
          `An error occured while saving image for ${c.type}${c.externalId ? ` - ${c.externalId}` : ''}`,
          { service: 'cam', type: c.type }
        );
        logger.error(error);
      }
    }
  } catch (error) {
    logger.error('An error occured while fetching webcam images', { service: 'cam' });
    logger.error(error);
    return null;
  }
}

export async function removeOldImages() {
  try {
    const cams = await Cam.find({});
    if (!cams.length) {
      logger.error(`No cams found.`, { service: 'cleanup' });
      return null;
    }

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    for (const c of cams) {
      await Cam.updateOne({ _id: c._id }, { $pull: { images: { time: { $lte: cutoff } } } });
    }

    dir.files('public/cams', async (err, files) => {
      if (err) throw err;
      for (const file of files) {
        const stats = await fs.stat(file);
        if (stats.birthtimeMs <= cutoff.getTime()) await fs.rm(file);
      }
    });
  } catch (error) {
    logger.error('An error occured while removing old images', { service: 'cleanup' });
    return null;
  }
}
