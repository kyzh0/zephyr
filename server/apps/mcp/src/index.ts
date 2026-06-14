import mongoose from 'mongoose';
import dotenv from 'dotenv';
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { logger, Client } from '@zephyr/shared';

import { registerStationTools } from './tools/stations.js';
import { registerSiteTools } from './tools/sites.js';
import { registerLandingTools } from './tools/landings.js';

const { NODE_ENV, DB_CONNECTION_STRING, MCP_PORT } = process.env;

if (NODE_ENV !== 'production' && NODE_ENV !== 'staging') {
  dotenv.config({ path: new URL('../../../.env', import.meta.url).pathname });
}

if (!DB_CONNECTION_STRING) {
  logger.error('DB_CONNECTION_STRING is not set');
  process.exit(1);
}

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(async (req, res, next) => {
  const key =
    (req.query.key as string | undefined) ?? req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!key) {
    res.status(401).json({ error: 'API key required (?key= or Authorization: Bearer)' });
    return;
  }

  const client = await Client.findOne({ apiKey: key }).lean();
  if (!client) {
    logger.warn('MCP request rejected — invalid API key');
    res.status(401).json({ error: 'Invalid API key.' });
    return;
  }

  logger.info(`MCP request from ${client.name}`);

  // Current month as yyyy-MM in UTC — matches the format used across public routes
  const currentMonth = new Date().toISOString().slice(0, 7);
  const usage = (client.usage ?? []).find((u) => u.month === currentMonth);

  if (usage && usage.apiCalls >= client.monthlyLimit) {
    logger.warn(
      `MCP request rejected — ${client.name} exceeded monthly limit of ${client.monthlyLimit}`
    );
    res.status(403).json({ error: `Monthly limit of ${client.monthlyLimit} API calls exceeded.` });
    return;
  }

  if (usage) {
    await Client.updateOne(
      { _id: client._id, __v: client.__v, 'usage.month': currentMonth },
      { $inc: { 'usage.$.apiCalls': 1, __v: 1 } }
    );
  } else {
    await Client.updateOne(
      { _id: client._id, __v: client.__v },
      { $push: { usage: { month: currentMonth, apiCalls: 1 } }, $inc: { __v: 1 } }
    );
  }

  next();
});

function createMcpServer() {
  const server = new McpServer({ name: 'zephyr', version: '1.0.0' });
  registerStationTools(server);
  registerSiteTools(server);
  registerLandingTools(server);
  return server;
}

// Streamable HTTP — one stateless transport per request
app.post('/', async (req, res) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', async () => {
    await transport.close();
    await server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// SSE stream for server-initiated messages (required by MCP spec, rarely used for read-only servers)
app.get('/', async (req, res) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', async () => {
    await transport.close();
    await server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res);
});

try {
  await mongoose.connect(DB_CONNECTION_STRING);

  const port = MCP_PORT ? Number(MCP_PORT) : 5001;
  app.listen(port, () => logger.info(`Zephyr MCP server running on port ${port}`));
} catch (error) {
  logger.error(error);
  process.exit(1);
}
