// ============================================================================
// server/src/db.js  —  DATABASE CONNECTION SETUP
// ----------------------------------------------------------------------------
// Creates the connection to PostgreSQL using Sequelize (an ORM — a library that
// lets us work with database tables as JavaScript objects instead of raw SQL).
//
// There are TWO modes:
//   - MEMORY_DB=1: spin up a temporary, throwaway PostgreSQL just for this run
//     (great for quick local dev/demos; all data vanishes when the server stops).
//   - otherwise: connect to a real PostgreSQL using DATABASE_URL.
// ============================================================================

import { Sequelize } from 'sequelize';
import os from 'os';      // to find the system temp directory
import path from 'path';
import fs from 'fs';

// Exported so other files (models, seed) can share the same connection instance.
export let sequelize;

export async function connectDB() {
  if (process.env.MEMORY_DB === '1') {
    // Dev mode: spin up a throwaway embedded PostgreSQL (fresh data every run).
    const { default: EmbeddedPostgres } = await import('embedded-postgres');
    // Create a unique temp folder to hold this run's database files.
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devpulse-pg-'));
    const pg = new EmbeddedPostgres({
      databaseDir: dataDir,
      user: 'devpulse',
      password: 'devpulse',
      port: 55432,
      persistent: false,
    });
    await pg.initialise();               // one-time setup of the data directory
    await pg.start();                    // boot the postgres process
    await pg.createDatabase('devpulse'); // create our database inside it
    // Make sure we shut the embedded postgres down cleanly when the server is
    // stopped (Ctrl-C = SIGINT, or a kill = SIGTERM).
    for (const sig of ['SIGINT', 'SIGTERM']) {
      process.on(sig, async () => {
        await pg.stop().catch(() => {});
        process.exit(0);
      });
    }
    // Point Sequelize at the embedded instance. `logging: false` silences SQL logs.
    sequelize = new Sequelize('postgres://devpulse:devpulse@127.0.0.1:55432/devpulse', { logging: false });
    await sequelize.authenticate();      // verify the connection actually works
    console.log('[db] connected to embedded PostgreSQL (dev mode, data is not persisted)');
    return sequelize;
  }

  // Production/normal mode: connect to a real PostgreSQL via a connection URL.
  const url = process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/devpulse';
  sequelize = new Sequelize(url, { logging: false });
  await sequelize.authenticate();
  // The .replace() masks the username/password in the log so credentials aren't printed.
  console.log(`[db] connected to PostgreSQL at ${url.replace(/\/\/.*@/, '//***@')}`);
  return sequelize;
}
