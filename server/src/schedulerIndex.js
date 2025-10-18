import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from './lib/logger.js';

import { startStationScheduler } from './scrapers/stations/scheduler.js';
import { startCamScheduler } from './scrapers/cams/scheduler.js';
import { startSoundingScheduler } from './scrapers/soundings/scheduler.js';

dotenv.config();

try {
  await mongoose.connect(process.env.DB_CONNECTION_STRING);

  await startStationScheduler();
  await startCamScheduler();
  await startSoundingScheduler();
} catch (error) {
  logger.error(error);
}
