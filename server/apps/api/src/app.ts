import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoute from './routes/authRoute';
import stationRoute from './routes/stationRoute';
import camRoute from './routes/camRoute';
import soundingRoute from './routes/soundingRoute';
import publicRoute from './routes/publicRoute';
import siteRoute from './routes/siteRoute';

const { NODE_ENV } = process.env;
if (NODE_ENV !== 'production' && NODE_ENV !== 'staging') {
  dotenv.config();
}

const app = express();
app.use(cors({ origin: [/zephyrapp\.nz$/, /^http(s)?:\/\/localhost:\d{4}.*$/] }));
app.use(express.json());

// static files are served by caddy in prod
if (NODE_ENV !== 'production' && NODE_ENV !== 'staging') {
  app.use(express.static('public'));
}

// routes
app.use('/auth', authRoute);
app.use('/stations', stationRoute);
app.use('/cams', camRoute);
app.use('/soundings', soundingRoute);
app.use('/sites', siteRoute);
app.use('/v1', publicRoute);

export default app;
