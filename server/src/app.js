import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import dotenv from 'dotenv';

import authRoute from './routes/authRoute.js';
import stationRoute from './routes/stationRoute.js';
import camRoute from './routes/camRoute.js';
import soundingRoute from './routes/soundingRoute.js';
import publicRoute from './routes/publicRoute.js';

import logger from './lib/logger.js';
import { removeOldImages } from './services/camService.js';
import { soundingWrapper } from './services/soundingService.js';

const app = express();
app.use(cors({ origin: [/zephyrapp\.nz$/, /^http(s)?:\/\/localhost:\d{4}.*$/] }));
app.use(express.json());
dotenv.config();

// static files are served by caddy in prod
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static('public'));
}

// routes
app.use('/auth', authRoute);
app.use('/stations', stationRoute);
app.use('/cams', camRoute);
app.use('/soundings', soundingRoute);
app.use('/v1', publicRoute);

// cron jobs
// webcams
// cron.schedule('*/10 * * * *', async () => {
//   logger.info('--- Update webcams start ---', { service: 'cam' });
//   const ts = Date.now();
//   await webcamWrapper();
//   logger.info(`--- Update webcams end - ${Date.now() - ts}ms elapsed.`, { service: 'cam' });
// });

// cleanup
cron.schedule('5 0 * * *', async () => {
  logger.info('--- Remove old images start ---', { service: 'cleanup' });
  const ts = Date.now();
  await removeOldImages();
  logger.info(`--- Remove old images end - ${Date.now() - ts}ms elapsed.`, { service: 'cleanup' });
});

// soundings - at 0730 NZT
cron.schedule(
  '30 7 * * *',
  async () => {
    logger.info('--- Update soundings start ---', { service: 'sounding' });
    const ts = Date.now();
    await soundingWrapper();
    logger.info(`--- Update soundings end - ${Date.now() - ts}ms elapsed.`, {
      service: 'sounding'
    });
  },
  { timezone: 'Pacific/Auckland' }
);

export default app;
