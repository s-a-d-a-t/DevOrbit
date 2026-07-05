import { Sequelize } from 'sequelize';
import os from 'os';
import path from 'path';
import fs from 'fs';

export let sequelize;

export async function connectDB() {
  if (process.env.MEMORY_DB === '1') {
    // Dev mode: spin up a throwaway embedded PostgreSQL (fresh data every run).
    const { default: EmbeddedPostgres } = await import('embedded-postgres');
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devpulse-pg-'));
    const pg = new EmbeddedPostgres({
      databaseDir: dataDir,
      user: 'devpulse',
      password: 'devpulse',
      port: 55432,
      persistent: false,
    });
    await pg.initialise();
    await pg.start();
    await pg.createDatabase('devpulse');
    for (const sig of ['SIGINT', 'SIGTERM']) {
      process.on(sig, async () => {
        await pg.stop().catch(() => {});
        process.exit(0);
      });
    }
    sequelize = new Sequelize('postgres://devpulse:devpulse@127.0.0.1:55432/devpulse', { logging: false });
    await sequelize.authenticate();
    console.log('[db] connected to embedded PostgreSQL (dev mode, data is not persisted)');
    return sequelize;
  }

  const url = process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/devpulse';
  sequelize = new Sequelize(url, { logging: false });
  await sequelize.authenticate();
  console.log(`[db] connected to PostgreSQL at ${url.replace(/\/\/.*@/, '//***@')}`);
  return sequelize;
}
