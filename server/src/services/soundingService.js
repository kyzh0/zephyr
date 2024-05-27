import axios from 'axios';
import sharp from 'sharp';
import fs from 'fs/promises';
import { fromZonedTime } from 'date-fns-tz';

import logger from '../helpers/log.js';

import { Sounding } from '../models/soundingModel.js';

async function processRaspSounding(s) {
  const dateTimeFormat = new Intl.DateTimeFormat('en-NZ', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: 'Pacific/Auckland'
  });
  const parts = dateTimeFormat.formatToParts(new Date());

  let year = '';
  let month = '';
  let day = '';
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
    }
  }

  for (let i = 9; i < 20; i++) {
    const hr = i.toString().padStart(2, '0');

    try {
      const response = await axios.get(
        `http://rasp.nz/rasp/regions/${s.raspRegion}+0/${year}/${year}${month}${day}/sounding${s.raspId}.curr.${hr}00lst.w2.png`,
        {
          responseType: 'arraybuffer',
          headers: {
            Connection: 'keep-alive'
          }
        }
      );
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      const imgBuff = Buffer.from(base64, 'base64');
      const resizedBuf = await sharp(imgBuff).resize({ width: 600 }).toBuffer();

      const timeStr = `${year}-${month}-${day}T${hr}:00:00`;
      const path = `public/soundings/${s.raspRegion}/${s.raspId}/${timeStr}.png`;
      await fs.writeFile(path, resizedBuf);

      const img = {
        time: fromZonedTime(timeStr, 'Pacific/Auckland'),
        url: path.replace('public/', '')
      };

      // add image
      await Sounding.updateOne(
        { _id: s._id },
        {
          $push: {
            images: img
          }
        }
      );

      logger.info(`rasp sounding updated - ${s.raspRegion} - ${s.raspId} - ${hr}`, {
        service: 'sounding'
      });
    } catch (error) {
      logger.warn(
        `An error occured while fetching rasp soundings - ${s.raspRegion} - ${s.raspId} - ${hr}`,
        {
          service: 'sounding'
        }
      );
    }
  }
}

export async function soundingWrapper() {
  try {
    const soundings = await Sounding.find({});
    if (!soundings.length) {
      logger.error('No soundings found.', { service: 'sounding' });
      return null;
    }

    for (const s of soundings) {
      // remove old images
      await Sounding.updateOne({ _id: s._id }, { $set: { images: [] } });
      const directory = `public/soundings/${s.raspRegion}/${s.raspId}`;
      await fs.rm(directory, { recursive: true, force: true });
      await fs.mkdir(directory, { recursive: true });

      await processRaspSounding(s);
    }
  } catch (error) {
    logger.error('An error occured while fetching soundings', { service: 'sounding' });
    logger.error(error);
    return null;
  }
}
