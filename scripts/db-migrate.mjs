#!/usr/bin/env node
// Standalone Drizzle migrator for production deploys. Uses only prod
// deps (better-sqlite3 + drizzle-orm) so `npm ci --omit=dev` is enough.
// Called from infra/deploy.sh before `systemctl restart oudejeuner` so
// a broken migration aborts the deploy instead of taking down live
// traffic on first request.
//
// Reads DATABASE_URL from the environment. In dev: .env via dotenv. In
// prod: the deploy script sources /etc/oudejeuner/env before invoking.

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

// dotenv is a prod dep; in dev it loads .env automatically when imported
// for side effects. On the box the env file is sourced by the caller.
try {
  await import('dotenv/config');
} catch {
  // No-op if dotenv isn't reachable — env should be set by the caller.
}

const dbPath = process.env.DATABASE_URL;
if (!dbPath) {
  console.error('DATABASE_URL must be set.');
  process.exit(1);
}

console.log(`Applying migrations to ${dbPath}`);
const sqlite = new Database(dbPath);
try {
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations applied.');
} finally {
  sqlite.close();
}
