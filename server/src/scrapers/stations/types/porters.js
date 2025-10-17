import fs from 'fs/promises';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import httpClient from '../../../lib/httpClient.js';
import processScrapedData from '../processScrapedData.js';
import logger from '../../../lib/logger.js';

export default async function scrapePortersData(stations) {
  try {
    const result = [];
    let windAverage = null;
    let windGust = null;
    let windBearing = null;
    let temperature = null;

    // fetch img
    const response = await httpClient.get('https://portersalpineresort.com/Screen.png', {
      responseType: 'arraybuffer'
    });
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    const imgBuff = Buffer.from(base64, 'base64');

    // init OCR
    const dir = 'public/temp/porters';
    await fs.mkdir(dir, { recursive: true });
    const worker = await createWorker('eng', 1, {
      errorHandler: (err) => {
        logger.warn(err);
        return err;
      }
    });

    // BASE AREA WEATHER STATION
    // avg
    let croppedBuf = await sharp(imgBuff)
      .extract({
        left: 195,
        top: 7115,
        width: 70,
        height: 20
      })
      .toBuffer();
    let path = `${dir}/portersbaseavg.jpg`;
    await fs.writeFile(path, croppedBuf);

    const reg = /[^0-9.]/g;
    let ret = await worker.recognize(path);
    let textAvg = ret.data.text.replace(reg, '');

    // gust
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: 195,
        top: 7155,
        width: 70,
        height: 20
      })
      .toBuffer();
    path = `${dir}/portersbasegust.jpg`;
    await fs.writeFile(path, croppedBuf);

    ret = await worker.recognize(path);
    let textGust = ret.data.text.replace(reg, '');

    windAverage = isNaN(textAvg) ? 0 : Number(textAvg);
    windGust = isNaN(textGust) ? 0 : Number(textGust);
    if (windGust < windAverage) windGust = null; // sometimes ocr fails for gust PORTERS BASE

    // direction
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: 275,
        top: 7115,
        width: 70,
        height: 20
      })
      .toBuffer();
    path = `${dir}/portersbasedir.jpg`;
    await fs.writeFile(path, croppedBuf);

    ret = await worker.recognize(path);
    windBearing = Number(ret.data.text.slice(0, 3).replace(reg, ''));

    // temperature
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: 195,
        top: 7018,
        width: 70,
        height: 20
      })
      .toBuffer();
    path = `${dir}/portersbasetemp.jpg`;
    await fs.writeFile(path, croppedBuf);

    ret = await worker.recognize(path);
    let textTemperature = ret.data.text.replace(reg, '');
    if (textTemperature.length && !textTemperature.includes('.')) {
      // sometimes ocr misses a .
      // temperature is always 1dp here
      textTemperature = `${textTemperature.slice(0, -1)}.${textTemperature.slice(-1)}`;
    }
    temperature = Number(textTemperature);
    result.push({
      id: 'base',
      data: {
        windAverage,
        windGust,
        windBearing,
        temperature
      }
    });

    // T-BAR 2 WEATHER STATION
    // avg
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: 478,
        top: 7112,
        width: 70,
        height: 20
      })
      .toBuffer();
    path = `${dir}/porterstbaravg.jpg`;
    await fs.writeFile(path, croppedBuf);

    ret = await worker.recognize(path);
    textAvg = ret.data.text.replace(reg, '');

    // gust
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: 478,
        top: 7152,
        width: 70,
        height: 20
      })
      .toBuffer();
    path = `${dir}/porterstbargust.jpg`;
    await fs.writeFile(path, croppedBuf);

    ret = await worker.recognize(path);
    textGust = ret.data.text.replace(reg, '');

    windAverage = isNaN(textAvg) ? 0 : Number(textAvg);
    windGust = isNaN(textGust) ? 0 : Number(textGust);

    // direction
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: 558,
        top: 7113,
        width: 70,
        height: 20
      })
      .toBuffer();
    path = `${dir}/porterstbardir.jpg`;
    await fs.writeFile(path, croppedBuf);

    ret = await worker.recognize(path);
    windBearing = Number(ret.data.text.slice(0, 3).replace(reg, ''));

    // temperature
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: 478,
        top: 7018,
        width: 70,
        height: 20
      })
      .toBuffer();
    path = `${dir}/porterstbartemp.jpg`;
    await fs.writeFile(path, croppedBuf);

    ret = await worker.recognize(path);
    textTemperature = ret.data.text.replace(reg, '');
    if (textTemperature.length && !textTemperature.includes('.')) {
      textTemperature = `${textTemperature.slice(0, -1)}.${textTemperature.slice(-1)}`;
    }
    temperature = Number(textTemperature);
    result.push({
      id: 'tbar',
      data: {
        windAverage,
        windGust,
        windBearing,
        temperature
      }
    });

    // RIDGELINE WEATHER STATION
    // avg
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: 760,
        top: 7112,
        width: 70,
        height: 20
      })
      .toBuffer();
    path = `${dir}/portersridgelineavg.jpg`;
    await fs.writeFile(path, croppedBuf);

    ret = await worker.recognize(path);
    textAvg = ret.data.text.replace(reg, '');

    // gust
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: 760,
        top: 7152,
        width: 70,
        height: 20
      })
      .toBuffer();
    path = `${dir}/portersridgelinegust.jpg`;
    await fs.writeFile(path, croppedBuf);

    ret = await worker.recognize(path);
    textGust = ret.data.text.replace(reg, '');

    windAverage = isNaN(textAvg) ? 0 : Number(textAvg);
    windGust = isNaN(textGust) ? 0 : Number(textGust);

    // direction
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: 842,
        top: 7111,
        width: 70,
        height: 20
      })
      .toBuffer();
    path = `${dir}/portersridgelinedir.jpg`;
    await fs.writeFile(path, croppedBuf);

    ret = await worker.recognize(path);
    windBearing = Number(ret.data.text.slice(0, 3).replace(reg, ''));

    // temperature
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: 760,
        top: 7018,
        width: 70,
        height: 20
      })
      .toBuffer();
    path = `${dir}/portersridgelinetemp.jpg`;
    await fs.writeFile(path, croppedBuf);

    ret = await worker.recognize(path);
    textTemperature = ret.data.text.replace(reg, '');
    if (textTemperature.length && !textTemperature.includes('.')) {
      textTemperature = `${textTemperature.slice(0, -1)}.${textTemperature.slice(-1)}`;
    }
    temperature = Number(textTemperature);
    result.push({
      id: 'ridgeline',
      data: {
        windAverage,
        windGust,
        windBearing,
        temperature
      }
    });

    // cleanup
    await worker.terminate();
    await fs.rm(dir, { recursive: true, force: true });

    for (const station of stations) {
      const d = result.find((x) => x.id === station.externalId);
      if (d) {
        await processScrapedData(
          station,
          d.data.windAverage,
          d.data.windGust,
          d.data.windBearing,
          d.data.temperature
        );
      } else {
        logger.warn(`porters error - no data for ${station.externalId}`, {
          service: 'station',
          type: 'porters'
        });

        await processScrapedData(station, null, null, null, null, true);
      }
    }
  } catch (error) {
    logger.warn('porters error', {
      service: 'station',
      type: 'porters'
    });
    logger.warn(error);

    for (const station of stations) {
      await processScrapedData(station, null, null, null, null, true);
    }
  }
}
