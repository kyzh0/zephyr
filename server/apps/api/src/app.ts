import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoute from './routes/authRoute';
import webcamRoute from './routes/webcamRoute';
import landingRoute from './routes/landingRoute';
import publicRoute from './routes/publicRoute';
import siteRoute from './routes/siteRoute';
import soundingRoute from './routes/soundingRoute';
import stationRoute from './routes/stationRoute';
import donationRoute from './routes/donationRoute';

const { NODE_ENV } = process.env;
if (NODE_ENV !== 'production' && NODE_ENV !== 'staging') {
  dotenv.config();
}

const app = express();
app.use(
  cors({ origin: [/^https:\/\/([a-z0-9-]+\.)*zephyrapp\.nz$/, /^http(s)?:\/\/localhost:\d{4}$/] })
);
app.use(express.json());

// static files are served by caddy in prod
if (NODE_ENV !== 'production' && NODE_ENV !== 'staging') {
  app.use(express.static('../scheduler/public'));
}

// routes
app.use('/auth', authRoute);
app.use('/webcams', webcamRoute);
app.use('/landings', landingRoute);
app.use('/v1', publicRoute);
app.use('/sites', siteRoute);
app.use('/soundings', soundingRoute);
app.use('/stations', stationRoute);
app.use('/donations', donationRoute);

// proxy for opentopodata elevation lookup
app.get('/elevation', async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);

  if (Number.isNaN(lat) || Number.isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    res.status(400).json({ error: 'Invalid lat/lon' });
    return;
  }

  try {
    const response = await fetch(`https://api.opentopodata.org/v1/nzdem8m?locations=${lat},${lon}`);

    if (!response.ok) {
      res.status(response.status).json({ error: 'Upstream elevation API error' });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch {
    res.status(502).json({ error: 'Failed to reach elevation API' });
  }
});

export default app;
