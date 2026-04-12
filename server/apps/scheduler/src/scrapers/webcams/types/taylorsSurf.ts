import { httpClient, logger, type WebcamAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

export default async function scrapeTaylorsSurfData(webcams: WithId<WebcamAttrs>[]): Promise<void> {
  const webcam = webcams[0];
  if (!webcam) {
    return;
  }

  try {
    const response = await httpClient.get<ArrayBuffer>(
      'https://stream.webmad.co.nz/shots/taylorssouth2.jpg',
      { responseType: 'arraybuffer' }
    );

    const base64 = Buffer.from(response.data).toString('base64');
    const updated = new Date();

    await processScrapedData(webcam, updated, base64);
  } catch {
    logger.warn('taylors surf error', {
      service: 'webcam',
      type: 'ts'
    });
  }
}
