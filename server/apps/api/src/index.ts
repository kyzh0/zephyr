import mongoose from 'mongoose';
import dotenv from 'dotenv';

import app from './app';
import { logger } from '@zephyr/shared';

const { NODE_ENV, DB_CONNECTION_STRING, NODE_PORT } = process.env;

if (NODE_ENV !== 'production' && NODE_ENV !== 'staging') {
  dotenv.config({ path: new URL('../../../.env', import.meta.url).pathname });
}

if (!DB_CONNECTION_STRING) {
  logger.error('DB_CONNECTION_STRING is not set');
  process.exit(1);
}

try {
  await mongoose.connect(DB_CONNECTION_STRING);

  const port = NODE_PORT ? Number(NODE_PORT) : 5000;
  app.listen(port, () => logger.info(`Server running on port ${port}`));
} catch (error) {
  logger.error(error);
  process.exit(1);
}
