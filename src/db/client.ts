import { resolve } from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import * as schema from './schema';

// Where the bundled drizzle/ folder ends up at runtime. The deploy tarball
// extracts it into the release root next to .next/, so resolve from cwd
// (which the systemd unit sets to the current symlink). In dev, cwd is the
// repo root.
const MIGRATIONS_DIR = resolve(process.cwd(), 'drizzle');

export type Db = ReturnType<typeof drizzle<typeof schema>>;

// Open a fresh connection. Used by one-off scripts (seed, migrations) that
// own their own lifecycle.
export function createDb(filePath: string): { db: Db; close: () => void } {
  const sqlite = new Database(filePath);
  applyPragmas(sqlite);
  const db = drizzle(sqlite, { schema });
  return { db, close: () => sqlite.close() };
}

function applyPragmas(sqlite: Database.Database): void {
  // WAL: concurrent readers + one writer, much better default than the legacy
  // rollback journal for a server workload.
  sqlite.pragma('journal_mode = WAL');
  // Durable enough alongside Litestream's continuous WAL replication.
  sqlite.pragma('synchronous = NORMAL');
  // Foreign keys are off by default in SQLite — turn them on.
  sqlite.pragma('foreign_keys = ON');
}

// Process-wide singleton for the Next.js server. Module caching gives us this
// for free in production; in dev the global ensures HMR doesn't leak handles.
const globalForDb = globalThis as unknown as { __ouDejeunerDb?: Db };

export function getDb(): Db {
  if (globalForDb.__ouDejeunerDb) return globalForDb.__ouDejeunerDb;
  const path = process.env.DATABASE_URL ?? './data/oudejeuner.db';
  const sqlite = new Database(path);
  applyPragmas(sqlite);
  const db = drizzle(sqlite, { schema });
  // Apply pending Drizzle migrations on first connection. Idempotent — a
  // fully-migrated DB is a fast no-op (one query against drizzle's tracking
  // table). Without this the deploy ships migration SQL to the box but
  // never actually runs it, and new tables silently miss in production.
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  globalForDb.__ouDejeunerDb = db;
  return db;
}
