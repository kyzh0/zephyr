import httpClient from '@/lib/httpClient';
import processScrapedData from '@/scrapers/cams/processScrapedData';
import logger from '@/lib/logger';

import { type CamAttrs } from '@/models/camModel';
import { type WithId } from '@/types/mongoose';

export default async function scrapeTaylorsSurfData(cams: WithId<CamAttrs>[]): Promise<void> {
  const cam = cams[0];
  if (!cam) return;

  try {
    const response = await httpClient.get<ArrayBuffer>(
      'https://stream.webmad.co.nz/shots/taylorssouth2.jpg',
      { responseType: 'arraybuffer' }
    );

    const base64 = Buffer.from(response.data).toString('base64');
    const updated = new Date();

    await processScrapedData(cam, updated, base64);
  } catch {
    logger.warn('taylors surf error', {
      service: 'cam',
      type: 'ts'
    });
  }
}
