import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import cron from 'node-cron';
import dotenv from 'dotenv';

import authRoute from './routes/authRoute.js';
import stationRoute from './routes/stationRoute.js';
import camRoute from './routes/camRoute.js';
import publicRoute from './routes/publicRoute.js';

import logger from './helpers/log.js';
import { removeOldImages, webcamWrapper } from './services/camService.js';
import {
  stationWrapper,
  holfuyWrapper,
  jsonOutputWrapper,
  checkForErrors,
  updateKeys,
  removeOldData
} from './services/stationService.js';

const app = express();
app.use(cors({ origin: [/zephyrapp\.nz$/, /^http(s)?:\/\/localhost:\d{4}.*$/] }));
app.use(express.json());
dotenv.config();

mongoose.connect(
  process.env.NODE_ENV === 'production'
    ? process.env.DB_CONNECTION_STRING
    : process.env.DEV_CONNECTION_STRING
);

// routes
app.use('/auth', authRoute);
app.use('/stations', stationRoute);
app.use('/cams', camRoute);
app.use('/v1', publicRoute);

// cron jobs
cron.schedule('*/10 * * * *', async () => {
  logger.info('--- Update webcams start ---', { service: 'cam' });
  const ts = Date.now();
  await webcamWrapper();
  logger.info(`Update webcams end - ${Date.now() - ts}ms elapsed.`, { service: 'cam' });
});
cron.schedule('*/10 * * * *', async () => {
  logger.info('--- Update stations start ---', { service: 'station', type: 'other' });
  const ts = Date.now();
  await stationWrapper();
  logger.info(`Update stations end - ${Date.now() - ts}ms elapsed.`, {
    service: 'station',
    type: 'other'
  });
});
cron.schedule('*/10 * * * *', async () => {
  logger.info('--- Update harvest stations start ---', { service: 'station', type: 'harvest' });
  const ts = Date.now();
  await stationWrapper('harvest');
  logger.info(`Update harvest stations end - ${Date.now() - ts}ms elapsed.`, {
    service: 'station',
    type: 'harvest'
  });
});
cron.schedule('*/10 * * * *', async () => {
  logger.info('--- Update metservice stations start ---', {
    service: 'station',
    type: 'metservice'
  });
  const ts = Date.now();
  await stationWrapper('metservice');
  logger.info(`Update metservice stations end - ${Date.now() - ts}ms elapsed.`, {
    service: 'station',
    type: 'metservice'
  });
});
cron.schedule('*/10 * * * *', async () => {
  logger.info('--- Update holfuy stations start ---', { service: 'station', type: 'holfuy' });
  const ts = Date.now();
  await holfuyWrapper();
  logger.info(`Update holfuy stations end - ${Date.now() - ts}ms elapsed.`, {
    service: 'station',
    type: 'holfuy'
  });
});
cron.schedule('3,13,23,33,43,53 * * * *', async () => {
  logger.info('--- Process json output start ---', { service: 'json' });
  const ts = Date.now();
  await jsonOutputWrapper();
  logger.info(`Process json output end - ${Date.now() - ts}ms elapsed.`, { service: 'json' });
});
cron.schedule('0 */6 * * *', async () => {
  logger.info('--- Check errors start ---', { service: 'errors' });
  const ts = Date.now();
  await checkForErrors();
  logger.info(`Check errors end - ${Date.now() - ts}ms elapsed.`, { service: 'errors' });
});
cron.schedule('0 0 * * *', async () => {
  logger.info('--- Update keys start ---', { service: 'keys' });
  const ts = Date.now();
  await updateKeys();
  logger.info(`Update keys end - ${Date.now() - ts}ms elapsed.`, { service: 'keys' });
});
cron.schedule('0 0 * * *', async () => {
  logger.info('--- Remove old data start ---', { service: 'cleanup' });
  const ts = Date.now();
  await removeOldData();
  logger.info(`Remove old data end - ${Date.now() - ts}ms elapsed.`, { service: 'cleanup' });
});
cron.schedule('0 0 * * *', async () => {
  logger.info('--- Remove old images start ---', { service: 'cleanup' });
  const ts = Date.now();
  await removeOldImages();
  logger.info(`Remove old images end - ${Date.now() - ts}ms elapsed.`, { service: 'cleanup' });
});

const port = process.env.NODE_PORT || 5000;
app.listen(port, () => logger.info(`Server running on port ${port}`));
