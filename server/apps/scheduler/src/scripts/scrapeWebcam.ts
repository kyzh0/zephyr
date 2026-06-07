import { Webcam } from '@zephyr/shared';
import scrapers from '../scrapers/webcams';

export default async function scrapeWebcam(type: string): Promise<void> {
  const webcams = await Webcam.find({ type, isDisabled: { $ne: true } });
  console.log(`Running ${type} scraper on ${webcams.length} webcam(s)...`);
  await scrapers[type as keyof typeof scrapers](webcams);
  console.log('Done');
  process.exit(0);
}
