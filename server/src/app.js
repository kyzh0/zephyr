import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoute from './routes/authRoute.js';
import stationRoute from './routes/stationRoute.js';
import camRoute from './routes/camRoute.js';
import soundingRoute from './routes/soundingRoute.js';
import publicRoute from './routes/publicRoute.js';

dotenv.config();
const app = express();
app.use(cors({ origin: [/zephyrapp\.nz$/, /^http(s)?:\/\/localhost:\d{4}.*$/] }));
app.use(express.json());

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

export default app;
