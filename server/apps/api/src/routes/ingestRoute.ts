import { timingSafeEqual } from 'node:crypto';
import express, { type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';

import { PushReading, Station, hashIngestKey, logger } from '@zephyr/shared';

const router = express.Router();

type IdParams = { id: string };

// km/h and °C, any field may be omitted or null
type IngestBody = {
  windAverage?: number | null;
  windGust?: number | null;
  windBearing?: number | null;
  temperature?: number | null;
};

const FIELDS = ['windAverage', 'windGust', 'windBearing', 'temperature'] as const;

// senders may push at any frequency, the scheduler normalises to 2 min buckets.
// this only stops a misconfigured sender from flooding the buffer.
const MIN_INTERVAL_MS = 5 * 1000;
const lastAccepted = new Map<string, number>();

function isAuthorised(header: string | undefined, storedHash: string | undefined): boolean {
  if (!header?.startsWith('Bearer ') || !storedHash) {
    return false;
  }

  const provided = Buffer.from(hashIngestKey(header.slice(7).trim()), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  return provided.length === stored.length && timingSafeEqual(provided, stored);
}

router.post('/stations/:id', async (req: Request<IdParams, unknown, IngestBody>, res: Response) => {
  const { id } = req.params;

  // unknown station and bad key are indistinguishable to the caller
  if (!ObjectId.isValid(id)) {
    res.sendStatus(401);
    return;
  }

  const station = await Station.findOne({ _id: new ObjectId(id), type: 'push' })
    .select('+ingestKeyHash isDisabled')
    .lean();

  if (!station || !isAuthorised(req.get('authorization'), station.ingestKeyHash)) {
    res.sendStatus(401);
    return;
  }

  if (station.isDisabled) {
    res.status(403).json({ error: 'Station is disabled' });
    return;
  }

  const body: unknown = req.body;
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ error: 'Body must be a JSON object' });
    return;
  }

  const reading: IngestBody = {};
  for (const field of FIELDS) {
    const value = (body as Record<string, unknown>)[field];
    if (value == null) {
      continue;
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      res.status(400).json({ error: `${field} must be a number or null` });
      return;
    }
    reading[field] = value;
  }

  if (!Object.keys(reading).length) {
    res.status(400).json({ error: `At least one of ${FIELDS.join(', ')} is required` });
    return;
  }

  const now = Date.now();
  const last = lastAccepted.get(id);
  if (last != null && now - last < MIN_INTERVAL_MS) {
    res.status(429).json({ error: `Max 1 reading per ${MIN_INTERVAL_MS / 1000}s` });
    return;
  }
  lastAccepted.set(id, now);

  try {
    await PushReading.create({ station: station._id, receivedAt: new Date(now), ...reading });
    res.sendStatus(204);
  } catch (err) {
    logger.error(`Ingest failed for station ${id}`, { service: 'ingest' });
    res.status(500).json(err);
  }
});

export default router;
