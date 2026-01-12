import app from './app.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from './lib/logger.js';

dotenv.config();

try {
  await mongoose.connect(process.env.DB_CONNECTION_STRING);

  const port = process.env.NODE_PORT || 5000;
  app.listen(port, () => logger.info(`Server running on port ${port}`));
} catch (error) {
  logger.error(error);
}
