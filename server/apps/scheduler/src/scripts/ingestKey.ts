import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import { Station, hashIngestKey } from '@zephyr/shared';

dotenv.config({ path: new URL('../../../../.env', import.meta.url).pathname });
dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

// Issues (or rotates) the ingest key for a station and switches it to push mode.
// The plaintext key is printed once and only its hash is stored.
const stationId = process.argv[2];
if (!stationId || !mongoose.isValidObjectId(stationId)) {
  console.error('Usage: ingest-key <stationId>');
  process.exit(1);
}

const { DB_CONNECTION_STRING } = process.env;

if (!DB_CONNECTION_STRING) {
  console.error('DB_CONNECTION_STRING is not set');
  process.exit(1);
}

try {
  await mongoose.connect(DB_CONNECTION_STRING);

  const station = await Station.findById(stationId).lean();
  if (!station) {
    console.error(`Station ${stationId} not found`);
    process.exit(1);
  }

  const key = randomBytes(32).toString('base64url');

  await Station.updateOne(
    { _id: station._id, __v: station.__v },
    {
      $set: { type: 'push', isHighResolution: true, ingestKeyHash: hashIngestKey(key) },
      $inc: { __v: 1 }
    }
  );

  console.log(`Ingest key for ${station.name} (${stationId}):\n\n  ${key}\n`);
  console.log('Store it now, it cannot be retrieved later. Any previous key is revoked.');
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
}
