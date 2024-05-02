import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import cron from 'node-cron';
import dotenv from 'dotenv';

import authRoute from './routes/authRoute.js';
import stationRoute from './routes/stationRoute.js';
import camRoute from './routes/camRoute.js';
import publicRoute from './routes/publicRoute.js';

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
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
dotenv.config();

mongoose.connect(process.env.CONNECTION_STRING);

// routes
app.use('/auth', authRoute);
app.use('/stations', stationRoute);
app.use('/cams', camRoute);
app.use('/v1', publicRoute);

// cron jobs
cron.schedule('*/10 * * * *', async () => {
  const ts = Date.now();
  await webcamWrapper();
  console.info(`Update webcams - ${Date.now() - ts}ms elapsed.`);
});
cron.schedule('*/10 * * * *', async () => {
  const ts = Date.now();
  await stationWrapper();
  console.info(`Update stations - ${Date.now() - ts}ms elapsed.`);
});
cron.schedule('*/10 * * * *', async () => {
  const ts = Date.now();
  await stationWrapper('harvest');
  console.info(`Update harvest stations - ${Date.now() - ts}ms elapsed.`);
});
cron.schedule('*/10 * * * *', async () => {
  const ts = Date.now();
  await stationWrapper('metservice');
  console.info(`Update metservice stations - ${Date.now() - ts}ms elapsed.`);
});
cron.schedule('*/10 * * * *', async () => {
  const ts = Date.now();
  await holfuyWrapper();
  console.info(`Update holfuy stations - ${Date.now() - ts}ms elapsed.`);
});
cron.schedule('5,15,25,35,45,55 * * * *', async () => {
  const ts = Date.now();
  await jsonOutputWrapper();
  console.info(`Process json output - ${Date.now() - ts}ms elapsed.`);
});
cron.schedule('0 */6 * * *', async () => {
  const ts = Date.now();
  await checkForErrors();
  console.info(`Check errors - ${Date.now() - ts}ms elapsed.`);
});
cron.schedule('0 0 * * *', async () => {
  const ts = Date.now();
  await updateKeys();
  console.info(`Update keys - ${Date.now() - ts}ms elapsed.`);
});
cron.schedule('0 0 * * *', async () => {
  const ts = Date.now();
  await removeOldData();
  console.info(`Remove old data - ${Date.now() - ts}ms elapsed.`);
});
cron.schedule('0 0 * * *', async () => {
  const ts = Date.now();
  await removeOldImages();
  console.info(`Remove old images - ${Date.now() - ts}ms elapsed.`);
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.info(`Server running on port ${port}`));
