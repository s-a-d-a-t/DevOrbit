// ============================================================================
// server/src/index.js  —  THE BACKEND ENTRY POINT (the Express web server)
// ----------------------------------------------------------------------------
// This is the Node.js server that the React app talks to. It:
//   1. connects to the PostgreSQL database,
//   2. defines the tables (models) and syncs them,
//   3. wires up the HTTP API routes under /api,
//   4. starts listening for requests.
//
// Big picture of a request: browser -> /api/... -> a route handler here -> the
// database -> JSON back to the browser. The `api.js` on the frontend is the other
// end of this conversation.
//
// Note the top-level `await`s: this file is an ES module, so we can await directly
// at the top level to set things up in order before the server starts.
// ============================================================================

import 'dotenv/config';        // loads variables from a .env file into process.env
import express from 'express'; // the web framework that handles HTTP routing
import cors from 'cors';       // lets the browser (a different origin in dev) call this API
import { connectDB } from './db.js';
import { initModels } from './models/index.js';
import { seedDemoData } from './seed.js';

// JWT_SECRET is the key used to sign/verify login tokens. In production it MUST be
// set to a real secret. Here we fall back to an insecure default for convenience
// during development and loudly warn about it.
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'devpulse-dev-secret';
  console.warn('[warn] JWT_SECRET not set — using an insecure dev default');
}

// 1. Connect, 2. define models on that connection, 3. sync schema to the DB.
const sequelize = await connectDB();
initModels(sequelize);

// Fresh Neon branches or partially restored databases can be missing some/all
// tables. In that case, do a plain sync first so Sequelize creates everything
// cleanly. Only use `alter` when all expected tables already exist.
{
  const queryInterface = sequelize.getQueryInterface();
  const existingTables = new Set((await queryInterface.showAllTables()).map((table) => String(table)));
  const expectedTables = Object.values(sequelize.models).map((model) => String(model.getTableName()));
  const hasAllTables = expectedTables.every((table) => existingTables.has(table));

  await sequelize.sync(hasAllTables ? { alter: true } : undefined);
}

// Routes import models, so load them after initModels().
// (These are dynamic imports — awaited here — precisely so the models exist first.)
const { requireAuth } = await import('./middleware/auth.js');
const { default: authRoutes } = await import('./routes/auth.js');
const { default: moduleRoutes } = await import('./routes/modules.js');
const { default: analyticsRoutes } = await import('./routes/analytics.js');

const app = express();       // create the Express application
app.use(cors());             // allow cross-origin requests (dev frontend on another port)
app.use(express.json());     // parse incoming JSON request bodies into req.body

// A public health-check endpoint — handy to confirm the server is up.
app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'DevPulse API', db: 'postgres' }));

// Mount the route groups. Auth routes are PUBLIC (login/register). The module and
// analytics routes are placed BEHIND `requireAuth`, so every request to them must
// carry a valid token — that middleware runs first and rejects unauthenticated calls.
app.use('/api/auth', authRoutes);
app.use('/api', requireAuth, moduleRoutes);
app.use('/api', requireAuth, analyticsRoutes);

// Central error handler. Express recognizes a middleware with FOUR args as the
// error handler; anything that throws or calls next(err) lands here. We map
// validation errors to 400 (bad request) and everything else to 500 (server error).
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.name?.startsWith('SequelizeValidation') || err.name === 'SequelizeUniqueConstraintError' ? 400 : 500;
  res.status(status).json({ message: err.message || 'Server error' });
});

// In throwaway embedded-DB mode the database is empty each run, so seed a demo
// account to log in with.
if (process.env.MEMORY_DB === '1') {
  await seedDemoData(); // embedded dev DB starts empty every run — seed a demo account
}

// Start the HTTP server on the configured port (default 5000).
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`[api] DevPulse listening on http://localhost:${port}`));
