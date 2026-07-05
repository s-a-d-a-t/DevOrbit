import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './db.js';
import { initModels } from './models/index.js';
import { seedDemoData } from './seed.js';

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'devpulse-dev-secret';
  console.warn('[warn] JWT_SECRET not set — using an insecure dev default');
}

const sequelize = await connectDB();
initModels(sequelize);
await sequelize.sync({ alter: true }); // create/update tables to match models

// Routes import models, so load them after initModels().
const { requireAuth } = await import('./middleware/auth.js');
const { default: authRoutes } = await import('./routes/auth.js');
const { default: moduleRoutes } = await import('./routes/modules.js');
const { default: analyticsRoutes } = await import('./routes/analytics.js');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'DevPulse API', db: 'postgres' }));
app.use('/api/auth', authRoutes);
app.use('/api', requireAuth, moduleRoutes);
app.use('/api', requireAuth, analyticsRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.name?.startsWith('SequelizeValidation') || err.name === 'SequelizeUniqueConstraintError' ? 400 : 500;
  res.status(status).json({ message: err.message || 'Server error' });
});

if (process.env.MEMORY_DB === '1') {
  await seedDemoData(); // embedded dev DB starts empty every run — seed a demo account
}

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`[api] DevPulse listening on http://localhost:${port}`));
