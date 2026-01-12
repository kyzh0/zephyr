import fs from 'node:fs/promises';
import sharp from 'sharp';
import { createWorker, type Worker as TesseractWorker } from 'tesseract.js';

import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/stations/processScrapedData';
import logger from '@/lib/logger';

import { type StationAttrs } from '@/models/stationModel';
import { type WithId } from '@/types/mongoose';

const REG_NUM = /[^0-9.]/g;

async function ocr(
  worker: TesseractWorker,
  dir: string,
  fileName: string,
  buf: Buffer
): Promise<string> {
  const filePath = `${dir}/${fileName}`;
  await fs.writeFile(filePath, buf);
  const ret = await worker.recognize(filePath);
  return ret.data.text;
}

export default async function scrapePrimePortData(stations: WithId<StationAttrs>[]): Promise<void> {
  const station = stations[0];
  if (!station) return;

  try {
    let windAverage: number | null = null;
    let windGust: number | null = null;
    let windBearing: number | null = null;
    const temperature: number | null = null;

    // fetch img
    const response = await httpClient.get<ArrayBuffer>(
      'https://local.timaru.govt.nz/primeport/NorthMoleWind.jpg',
      { responseType: 'arraybuffer' }
    );
    const imgBuff = Buffer.from(response.data);

    // init OCR
    const dir = 'public/temp/prime';
    await fs.mkdir(dir, { recursive: true });

    const worker = await createWorker('eng', 1, {
      errorHandler: (error) => {
        const msg = error instanceof Error ? error.message : String(error);
        logger.warn(msg, { service: 'station', type: 'prime' });
        return error;
      }
    });

    // sometimes img changes size
    const meta = await sharp(imgBuff).metadata();
    const width = meta.width ?? 0;

    // avg
    let croppedBuf = await sharp(imgBuff)
      .extract({
        left: width > 1000 ? 850 : 680,
        top: 170,
        width: width > 1000 ? 175 : 140,
        height: 50
      })
      .toBuffer();

    const textAvg = (await ocr(worker, dir, 'primeportavg.jpg', croppedBuf)).replace(REG_NUM, '');

    // gust
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: width > 1000 ? 850 : 680,
        top: 30,
        width: width > 1000 ? 175 : 140,
        height: 50
      })
      .toBuffer();

    const textGust = (await ocr(worker, dir, 'primeportgust.jpg', croppedBuf)).replace(REG_NUM, '');

    windAverage = Number.isNaN(Number(textAvg)) ? 0 : Number(textAvg);
    windGust = Number.isNaN(Number(textGust)) ? 0 : Number(textGust);

    // sometimes OCR misses a period
    if (!textAvg.includes('.') && textGust.includes('.')) {
      const i = textGust.indexOf('.');
      windAverage = Number(`${textAvg.slice(0, i)}.${textAvg.slice(i)}`);
      if (windAverage > windGust) windAverage = Math.round(windAverage * 100) / 1000;
    } else if (textAvg.includes('.') && !textGust.includes('.')) {
      const i = textAvg.indexOf('.');
      windGust = Number(`${textGust.slice(0, i)}.${textGust.slice(i)}`);
      if (windAverage > windGust) windGust = Math.round(windGust * 1000) / 100;
    } else if (!textAvg.includes('.') && !textGust.includes('.')) {
      if (windAverage > 10) windAverage = null;
      if (windGust > 10) windGust = null;
    }

    if (windAverage != null) windAverage = Math.round(windAverage * 1.852 * 100) / 100; // kt -> km/h
    if (windGust != null) windGust = Math.round(windGust * 1.852 * 100) / 100;

    // direction
    croppedBuf = await sharp(imgBuff)
      .extract({
        left: width > 1000 ? 845 : 675,
        top: 250,
        width: width > 1000 ? 180 : 145,
        height: 50
      })
      .toBuffer();

    const dirText = (await ocr(worker, dir, 'primeportdir.jpg', croppedBuf)).replace(REG_NUM, '');
    const bearing = Number(dirText);
    windBearing = Number.isNaN(bearing) ? null : bearing;

    // cleanup
    await worker.terminate();
    await fs.rm(dir, { recursive: true, force: true });

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch (error) {
    logger.warn('primeport error', { service: 'station', type: 'prime' });

    const msg = error instanceof Error ? error.message : String(error);
    logger.warn(msg, { service: 'station', type: 'prime' });

    await processScrapedData(station, null, null, null, null, true);
  }
}
