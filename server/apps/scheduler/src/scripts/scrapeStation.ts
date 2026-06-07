import { Station } from '@zephyr/shared';
import scrapers from '../scrapers/stations';

export default async function scrapeStation(type: string): Promise<void> {
  const stations = await Station.find({ type, isDisabled: { $ne: true } });
  console.log(`Running ${type} scraper on ${stations.length} station(s)...`);
  await scrapers[type as keyof typeof scrapers](stations);
  console.log('Done');
  process.exit(0);
}
