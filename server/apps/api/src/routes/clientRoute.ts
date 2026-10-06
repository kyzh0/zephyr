import express, { type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';

import { Client, User, logger } from '@zephyr/shared';

const router = express.Router();

type ApiKeyQuery = { key?: string };
type IdParams = { id: string };

type CreateClientBody = {
  name: string;
  apiKey: string;
  monthlyLimit: number;
};

type PatchClientBody = {
  __v?: number;
  name?: string;
  apiKey?: string;
  monthlyLimit?: number;
};

router.get(
  '/',
  async (req: Request<Record<string, never>, unknown, unknown, ApiKeyQuery>, res: Response) => {
    const user = await User.findOne({ key: req.query.key }).lean();
    if (!user) {
      res.sendStatus(401);
      return;
    }

    const clients = await Client.find().lean();
    res.json(clients);
  }
);

router.post(
  '/',
  async (
    req: Request<Record<string, never>, unknown, CreateClientBody, ApiKeyQuery>,
    res: Response
  ) => {
    const user = await User.findOne({ key: req.query.key }).lean();
    if (!user) {
      res.sendStatus(401);
      return;
    }

    const { name, apiKey, monthlyLimit } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Client name is required' });
      return;
    }
    if (!apiKey) {
      res.status(400).json({ error: 'API key is required' });
      return;
    }
    if (monthlyLimit == null || !Number.isInteger(monthlyLimit) || monthlyLimit < 0) {
      res.status(400).json({ error: 'Monthly limit must be a non-negative integer' });
      return;
    }

    logger.info(`Client added by ${user.username}: ${name} - limit ${monthlyLimit}`, {
      service: 'admin'
    });

    const client = new Client({ name, apiKey, monthlyLimit, usage: [] });

    try {
      await client.save();
      res.header('Location', `${req.protocol}://${req.get('host')}/clients/${client._id}`);
      res.sendStatus(201);
    } catch (err) {
      res.status(500).json(err);
    }
  }
);

router.get('/:id', async (req: Request<IdParams, unknown, unknown, ApiKeyQuery>, res: Response) => {
  const user = await User.findOne({ key: req.query.key }).lean();
  if (!user) {
    res.sendStatus(401);
    return;
  }

  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    res.sendStatus(404);
    return;
  }

  const client = await Client.findOne({ _id: new ObjectId(id) }).lean();
  if (!client) {
    res.sendStatus(404);
    return;
  }

  res.json(client);
});

router.patch(
  '/:id',
  async (req: Request<IdParams, unknown, PatchClientBody, ApiKeyQuery>, res: Response) => {
    const { id } = req.params;

    const user = await User.findOne({ key: req.query.key }).lean();
    if (!user) {
      res.sendStatus(401);
      return;
    }

    if (!ObjectId.isValid(id)) {
      res.sendStatus(404);
      return;
    }

    const client = await Client.findOne({ _id: new ObjectId(id) });
    if (!client) {
      res.sendStatus(404);
      return;
    }

    const { __v, name, apiKey, monthlyLimit } = req.body;
    if (__v == null) {
      res.sendStatus(400);
      return;
    }
    if (client.__v !== __v) {
      res.sendStatus(409);
      return;
    }

    logger.info(`Client ${id} patched by ${user.username}: ${client.name}`, { service: 'admin' });

    if (name !== undefined) {
      client.name = name;
    }
    if (apiKey !== undefined) {
      client.apiKey = apiKey;
    }
    if (monthlyLimit !== undefined) {
      client.monthlyLimit = monthlyLimit;
    }

    try {
      await client.save();
      res.json(client.toObject());
    } catch (err) {
      res.status(500).json(err);
    }
  }
);

router.delete(
  '/:id',
  async (req: Request<IdParams, unknown, unknown, ApiKeyQuery>, res: Response) => {
    const user = await User.findOne({ key: req.query.key }).lean();
    if (!user) {
      res.sendStatus(401);
      return;
    }

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      res.sendStatus(404);
      return;
    }

    const client = await Client.findOne({ _id: new ObjectId(id) }).lean();
    if (!client) {
      res.sendStatus(404);
      return;
    }

    logger.info(`Client deleted by ${user.username}: ${client.name} - ${id}`, {
      service: 'admin'
    });

    await Client.deleteOne({ _id: new ObjectId(id) });
    res.sendStatus(204);
  }
);

export default router;
