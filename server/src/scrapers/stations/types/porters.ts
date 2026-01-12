import fs from 'node:fs/promises';
import sharp from 'sharp';
import { createWorker, type Worker as TesseractWorker } from 'tesseract.js';
import { fromZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';

import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/stations/processScrapedData';
import logger from '@/lib/logger';

import type { StationAttrs } from '@/models/stationModel';
import type { WithId } from '@/types/mongoose';

type PorterResult = {
  id: string;
  data: {
    windAverage: number | null;
    windGust: number | null;
    windBearing: number | null;
    temperature: number | null;
  };
};

type Crop = { left: number; top: number; width: number; height: number };

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

async function crop(imgBuff: Buffer, c: Crop): Promise<Buffer> {
  return sharp(imgBuff).extract(c).toBuffer();
}

function parsePortersTime(text: string): Date | null {
  const start = text.indexOf(', ') + 2;
  const end = text.indexOf('m.') + 2;
  if (start < 2 || end < 2 || end <= start) return null;

  const textTime = text.substring(start, end).trim();
  const parsed = parse(textTime, 'dd MMMM yyyy hh:mm:ss aaaa', new Date());
  if (Number.isNaN(parsed.getTime())) return null;

  return fromZonedTime(parsed, 'Pacific/Auckland');
}

function maybeFixOneDp(s: string): string {
  // Sometimes OCR misses a '.' - always 1dp
  if (s.length && !s.includes('.')) return `${s.slice(0, -1)}.${s.slice(-1)}`;
  return s;
}

export default async function scrapePortersData(stations: WithId<StationAttrs>[]): Promise<void> {
  try {
    const result: PorterResult[] = [];

    let windAverage: number | null = null;
    let windGust: number | null = null;
    let windBearing: number | null = null;
    let temperature: number | null = null;

    // fetch img
    const response = await httpClient.get<ArrayBuffer>(
      'https://portersalpineresort.com/Screen.png',
      {
        responseType: 'arraybuffer'
      }
    );

    const imgBuff = Buffer.from(response.data);

    // init OCR
    const dir = 'public/temp/porters';
    await fs.mkdir(dir, { recursive: true });

    const worker = await createWorker('eng', 1, {
      errorHandler: (error) => {
        const msg = error instanceof Error ? error.message : String(error);
        logger.warn(msg, { service: 'station', type: 'porters' });
        return error;
      }
    });

    // ----- BASE AREA WEATHER STATION -----
    // time
    let croppedBuf = await crop(imgBuff, { left: 198, top: 6938, width: 225, height: 15 });
    let text = await ocr(worker, dir, 'portersbasetime.jpg', croppedBuf);
    let time = parsePortersTime(text);

    // ignore if data is older than 30 mins
    if (time && Date.now() - time.getTime() < 30 * 60 * 1000) {
      // avg
      croppedBuf = await crop(imgBuff, { left: 195, top: 7115, width: 70, height: 20 });
      text = await ocr(worker, dir, 'portersbaseavg.jpg', croppedBuf);
      const textAvg = text.replace(REG_NUM, '');

      // gust
      croppedBuf = await crop(imgBuff, { left: 195, top: 7155, width: 70, height: 20 });
      text = await ocr(worker, dir, 'portersbasegust.jpg', croppedBuf);
      const textGust = text.replace(REG_NUM, '');

      windAverage = Number.isNaN(Number(textAvg)) ? 0 : Number(textAvg);
      windGust = Number.isNaN(Number(textGust)) ? 0 : Number(textGust);
      if (windGust < windAverage) windGust = null; // sometimes OCR fails for gust (base)

      // direction
      croppedBuf = await crop(imgBuff, { left: 275, top: 7115, width: 70, height: 20 });
      text = await ocr(worker, dir, 'portersbasedir.jpg', croppedBuf);
      windBearing = Number(text.slice(0, 3).replace(REG_NUM, ''));

      // temperature
      croppedBuf = await crop(imgBuff, { left: 195, top: 7018, width: 70, height: 20 });
      text = await ocr(worker, dir, 'portersbasetemp.jpg', croppedBuf);
      const textTemperature = maybeFixOneDp(text.replace(REG_NUM, ''));
      temperature = Number(textTemperature);

      result.push({
        id: 'base',
        data: { windAverage, windGust, windBearing, temperature }
      });
    }

    // ----- T-BAR 2 WEATHER STATION -----
    croppedBuf = await crop(imgBuff, { left: 478, top: 6937, width: 225, height: 15 });
    text = await ocr(worker, dir, 'porterstbartime.jpg', croppedBuf);
    time = parsePortersTime(text);

    if (time && Date.now() - time.getTime() < 30 * 60 * 1000) {
      // avg
      croppedBuf = await crop(imgBuff, { left: 478, top: 7112, width: 70, height: 20 });
      text = await ocr(worker, dir, 'porterstbaravg.jpg', croppedBuf);
      const textAvg = text.replace(REG_NUM, '');

      // gust
      croppedBuf = await crop(imgBuff, { left: 478, top: 7152, width: 70, height: 20 });
      text = await ocr(worker, dir, 'porterstbargust.jpg', croppedBuf);
      const textGust = text.replace(REG_NUM, '');

      windAverage = Number.isNaN(Number(textAvg)) ? 0 : Number(textAvg);
      windGust = Number.isNaN(Number(textGust)) ? 0 : Number(textGust);

      // direction
      croppedBuf = await crop(imgBuff, { left: 558, top: 7113, width: 70, height: 20 });
      text = await ocr(worker, dir, 'porterstbardir.jpg', croppedBuf);
      windBearing = Number(text.slice(0, 3).replace(REG_NUM, ''));

      // temperature
      croppedBuf = await crop(imgBuff, { left: 478, top: 7018, width: 70, height: 20 });
      text = await ocr(worker, dir, 'porterstbartemp.jpg', croppedBuf);
      const textTemperature = maybeFixOneDp(text.replace(REG_NUM, ''));
      temperature = Number(textTemperature);

      result.push({
        id: 'tbar',
        data: { windAverage, windGust, windBearing, temperature }
      });
    }

    // ----- RIDGELINE WEATHER STATION -----
    croppedBuf = await crop(imgBuff, { left: 751, top: 6937, width: 225, height: 15 });
    text = await ocr(worker, dir, 'portersridgelinetime.jpg', croppedBuf);
    time = parsePortersTime(text);

    if (time && Date.now() - time.getTime() < 30 * 60 * 1000) {
      // avg
      croppedBuf = await crop(imgBuff, { left: 760, top: 7112, width: 70, height: 20 });
      text = await ocr(worker, dir, 'portersridgelineavg.jpg', croppedBuf);
      const textAvg = text.replace(REG_NUM, '');

      // gust
      croppedBuf = await crop(imgBuff, { left: 760, top: 7152, width: 70, height: 20 });
      text = await ocr(worker, dir, 'portersridgelinegust.jpg', croppedBuf);
      const textGust = text.replace(REG_NUM, '');

      windAverage = Number.isNaN(Number(textAvg)) ? 0 : Number(textAvg);
      windGust = Number.isNaN(Number(textGust)) ? 0 : Number(textGust);

      // direction
      croppedBuf = await crop(imgBuff, { left: 842, top: 7111, width: 70, height: 20 });
      text = await ocr(worker, dir, 'portersridgelinedir.jpg', croppedBuf);
      windBearing = Number(text.slice(0, 3).replace(REG_NUM, ''));

      // temperature
      croppedBuf = await crop(imgBuff, { left: 760, top: 7018, width: 70, height: 20 });
      text = await ocr(worker, dir, 'portersridgelinetemp.jpg', croppedBuf);
      const textTemperature = maybeFixOneDp(text.replace(REG_NUM, ''));
      temperature = Number(textTemperature);

      result.push({
        id: 'ridgeline',
        data: { windAverage, windGust, windBearing, temperature }
      });
    }

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
    logger.warn('porters error', { service: 'station', type: 'porters' });

    const msg = error instanceof Error ? error.message : String(error);
    logger.warn(msg, { service: 'station', type: 'porters' });

    for (const station of stations) {
      await processScrapedData(station, null, null, null, null, true);
    }
  }
}
