import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import cron from 'node-cron';
import dotenv from 'dotenv';

import authRoute from './routes/authRoute.js';
import stationRoute from './routes/stationRoute.js';
import camRoute from './routes/camRoute.js';

import { stationWrapper, holfuyWrapper } from './services/stationService.js';

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
  await stationWrapper();
});
cron.schedule('*/10 * * * *', async () => {
  await stationWrapper('harvest');
});
cron.schedule('*/10 * * * *', async () => {
  await stationWrapper('metservice');
});
cron.schedule('*/10 * * * *', async () => {
  await holfuyWrapper();
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));
