import mongoose from 'mongoose';
import dotenv from 'dotenv';

import { logger } from '@zephyr/shared';
import { startStationScheduler } from './scrapers/stations/scheduler';
import { startCamScheduler } from './scrapers/cams/scheduler';
import { startSoundingScheduler } from './scrapers/soundings/scheduler';

const { NODE_ENV, DB_CONNECTION_STRING } = process.env;

if (NODE_ENV !== 'production' && NODE_ENV !== 'staging') {
  dotenv.config({ path: new URL('../../../.env', import.meta.url).pathname });
  dotenv.config({ path: new URL('../.env', import.meta.url).pathname });
}

if (!DB_CONNECTION_STRING) {
  logger.error('DB_CONNECTION_STRING is not set');
  process.exit(1);
}

try {
  await mongoose.connect(DB_CONNECTION_STRING);

  await startStationScheduler();
  await startCamScheduler();
  await startSoundingScheduler();
} catch (error) {
  logger.error(error);
  process.exit(1);
}
