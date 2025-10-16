import app from './app.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from './lib/logger.js';

import './scrapers/stations/scheduler.js';
import './scrapers/cams/scheduler.js';

dotenv.config();

mongoose.connect(
  process.env.NODE_ENV === 'production'
    ? process.env.DB_CONNECTION_STRING
    : process.env.DEV_CONNECTION_STRING
);

const port = process.env.NODE_PORT || 5000;
app.listen(port, () => logger.info(`Server running on port ${port}`));
