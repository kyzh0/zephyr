import fs from 'fs/promises';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapePrimePortData(stations) {
  const station = stations[0];

  try {
    let windAverage = null;
    let windGust = null;
    let windBearing = null;
    const temperature = null;

    // fetch img
    const response = await httpClient.get(
      'https://local.timaru.govt.nz/primeport/NorthMoleWind.jpg',
      {
        responseType: 'arraybuffer'
      }
    );
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    const imgBuff = Buffer.from(base64, 'base64');

    // init OCR
    const dir = 'public/temp/prime';
    await fs.mkdir(dir, { recursive: true });
    const worker = await createWorker('eng', 1, {
      errorHandler: (error) => {
        logger.warn(error, {
          service: 'station',
          type: 'prime'
        });
        return error;
      }
    });

    // sometimes img changes size
    const meta = await sharp(imgBuff).metadata();

    // avg
    let croppedBuf = await sharp(imgBuff)
      .extract({
        left: meta.width > 1000 ? 850 : 680,
        top: 170,
        width: meta.width > 1000 ? 175 : 140,
        height: 50
      })
      .toBuffer();
    let path = `${dir}/primeportavg.jpg`;
    await fs.writeFile(path, croppedBuf);

    const reg = /[^0-9.]/g;
    let ret = await worker.recognize(path);
    const textAvg = ret.data.text.replace(reg, '');

    // gust
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: meta.width > 1000 ? 850 : 680,
        top: 30,
        width: meta.width > 1000 ? 175 : 140,
        height: 50
      })
      .toBuffer();
    path = `${dir}/primeportgust.jpg`;
    await fs.writeFile(path, croppedBuf);

    ret = await worker.recognize(path);
    const textGust = ret.data.text.replace(reg, '');

    windAverage = isNaN(textAvg) ? 0 : Number(textAvg);
    windGust = isNaN(textGust) ? 0 : Number(textGust);

    // sometimes OCR misses a period
    if (!textAvg.includes('.') && textGust.includes('.')) {
      const i = textGust.indexOf('.');
      windAverage = Number(`${textAvg.slice(0, i)}.${textAvg.slice(i)}`);
      if (windAverage > windGust) {
        windAverage = Math.round(windAverage * 100) / 1000;
      }
    } else if (textAvg.includes('.') && !textGust.includes('.')) {
      const i = textAvg.indexOf('.');
      windGust = Number(`${textGust.slice(0, i)}.${textGust.slice(i)}`);
      if (windAverage > windGust) {
        windGust = Math.round(windGust * 1000) / 100;
      }
    } else if (!textAvg.includes('.') && !textGust.includes('.')) {
      if (windAverage > 10) {
        windAverage = null;
      }
      if (windGust > 10) {
        windGust = null;
      }
    }

    if (windAverage != null) {
      windAverage = Math.round(windAverage * 1.852 * 100) / 100;
    }
    if (windGust != null) {
      windGust = Math.round(windGust * 1.852 * 100) / 100;
    }

    // direction
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: meta.width > 1000 ? 845 : 675,
        top: 250,
        width: meta.width > 1000 ? 180 : 145,
        height: 50
      })
      .toBuffer();
    path = `${dir}/primeportdir.jpg`;
    await fs.writeFile(path, croppedBuf);

    ret = await worker.recognize(path);
    windBearing = Number(ret.data.text.replace(reg, ''));

    // cleanup
    await worker.terminate();
    await fs.rm(dir, { recursive: true, force: true });

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch (error) {
    logger.warn('primeport error', {
      service: 'station',
      type: 'prime'
    });
    logger.warn(error.message, {
      service: 'station',
      type: 'prime'
    });

    await processScrapedData(station, null, null, null, null, true);
  }
}
