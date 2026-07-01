import express from 'express';
import { postgraphile } from 'postgraphile';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import PgAggregatesPlugin from '@graphile/pg-aggregates';
import ConnectionFilterPlugin from 'postgraphile-plugin-connection-filter';
import { TagsFilePlugin } from 'postgraphile/plugins.js';

import { databaseUrl } from './lib/db.js';
import {
  getOverview,
  getTaskBreakdown,
  getQueues,
  getWorkers,
  getTopErrors,
  getCrontabs,
} from './lib/observability.js';
import { ensureSchema, startCollector, getTimeseries } from './lib/metrics.js';
import { runJobAction, unlockQueues, unlockWorkers } from './lib/actions.js';

const app = express();
const port = process.env.PORT || 5001;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  }),
);
app.use(express.json());

/* --------------------------------------------------------------------------
 * Observability REST API — powers the reimagined dashboard.
 * Reads that are easy in raw SQL live here; flexible/filtered browsing of jobs
 * still goes through the auto-generated GraphQL API below.
 * ------------------------------------------------------------------------ */
const api = express.Router();

// Wrap async handlers so rejections become clean 500s instead of hanging.
const h = (fn) => (req, res) => {
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error(`[api] ${req.method} ${req.path} failed:`, err.message);
    res.status(500).json({ error: err.message });
  });
};

api.get('/overview', h(async (req, res) => {
  const [overview, tasks, errors] = await Promise.all([
    getOverview(),
    getTaskBreakdown(),
    getTopErrors(8),
  ]);
  res.json({ overview, tasks, errors });
}));

api.get('/metrics/timeseries', h(async (req, res) => {
  res.json(await getTimeseries(req.query.window || '1h'));
}));

api.get('/tasks', h(async (req, res) => res.json(await getTaskBreakdown())));
api.get('/queues', h(async (req, res) => res.json(await getQueues())));
api.get('/workers', h(async (req, res) => res.json(await getWorkers())));
api.get('/errors', h(async (req, res) => res.json(await getTopErrors(Number(req.query.limit) || 20))));
api.get('/crontabs', h(async (req, res) => res.json(await getCrontabs())));

// Job actions: POST /api/jobs/:action  { ids: [...], ...opts }
api.post('/jobs/:action', h(async (req, res) => {
  const { ids, ...opts } = req.body || {};
  res.json(await runJobAction(req.params.action, ids, opts));
}));

api.post('/queues/unlock', h(async (req, res) => {
  res.json(await unlockQueues(req.body?.queueNames));
}));

api.post('/workers/unlock', h(async (req, res) => {
  res.json(await unlockWorkers(req.body?.workerIds));
}));

app.use('/api', api);

/* -------------------------------------------------------------------------- */

const postgraphileOptions = {
  subscriptions: true,
  watchPg: true,
  dynamicJson: true,
  setofFunctionsContainNulls: false,
  ignoreRBAC: false,
  showErrorStack: 'json',
  extendedErrors: ['hint', 'detail', 'errcode'],
  appendPlugins: [TagsFilePlugin, ConnectionFilterPlugin, PgAggregatesPlugin.default],
  exportGqlSchemaPath: 'tmp/schema.graphql',
  graphiql: true,
  enhanceGraphiql: true,
  allowExplain: true,
  enableQueryBatching: true,
  legacyRelations: 'omit',
  pgSettings: { search_path: 'graphile_worker,public' },
  schemas: ['graphile_worker'],
  includeExtensionResources: true,
};

const postgraphileMiddleware = postgraphile(databaseUrl, 'graphile_worker', postgraphileOptions);
app.use(postgraphileMiddleware);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const server = createServer(app);

const wsServer = new WebSocketServer({ server, path: '/graphql' });
useServer(
  {
    schema: postgraphileMiddleware.getGraphQLSchema(),
    context: () => ({ pgPool: postgraphileMiddleware.pgPool }),
  },
  wsServer,
);

server.listen(port, async () => {
  console.log(`🚀 Graphile Worker UI backend at http://localhost:${port}`);
  console.log(`📊 GraphiQL at http://localhost:${port}/graphiql`);
  console.log(`🔌 Subscriptions at ws://localhost:${port}/graphql`);
  try {
    await ensureSchema();
    startCollector();
  } catch (err) {
    console.error('⚠️  Metrics collector disabled (could not reach DB):', err.message);
  }
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
