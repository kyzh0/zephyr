import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import cron from 'node-cron';
import dotenv from 'dotenv';

import authRoute from './routes/authRoute.js';
import stationRoute from './routes/stationRoute.js';
import camRoute from './routes/camRoute.js';

import {
  stationWrapper,
  holfuyWrapper,
  jsonOutputWrapper,
  checkForErrors
} from './services/stationService.js';

const app = express();
app.use(cors());
app.use(express.json());
dotenv.config();

mongoose.connect(process.env.CONNECTION_STRING);

// routes
app.use('/auth', authRoute);
app.use('/stations', stationRoute);
app.use('/cams', camRoute);

// cron jobs
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
  console.info(`Check for errors - ${Date.now() - ts}ms elapsed.`);
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.info(`Server running on port ${port}`));
