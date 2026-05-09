/**
 * One-shot migration: applies Drizzle schema migrations and seeds the
 * `restaurants` table from `data/restaurants-audited.json`.
 *
 * Idempotent. Re-runs upsert on `place_id`, preserving `firstSeenAt` and
 * any admin overrides (hide / new-badge / per-attribute overrides).
 *
 * Run with: `pnpm db:seed`  (or `npx tsx scripts/migrate_json_to_sqlite.ts`)
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import 'dotenv/config';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import { createDb } from '../src/db/client';
import { restaurants, type RegularOpeningHours } from '../src/db/schema';

type RawAudit = {
  tags?: string[];
  severity?: 'high' | 'medium' | 'low' | null;
  exclude_recommend?: boolean;
};

type RawPlace = {
  id: string;
  displayName?: { text?: string; languageCode?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  googleMapsUri?: string;
  primaryType?: string;
  primaryTypeLabel?: string;
  primaryTypeIcon?: string;
  types?: string[];
  typesLabels?: string[];
  typesIcons?: string[];
  priceLevel?: string;
  regularOpeningHours?: RegularOpeningHours;
  businessStatus?: string;
  audit?: RawAudit;
};

type RawPayload = { places: RawPlace[] };

function main(): void {
  const dbPath = process.env.DATABASE_URL ?? './data/oudejeuner.db';
  const jsonPath = resolve(process.cwd(), 'data', 'restaurants-audited.json');

  console.log(`opening DB at ${dbPath}`);
  const { db, close } = createDb(dbPath);

  try {
    console.log('applying migrations from ./drizzle');
    migrate(db, { migrationsFolder: './drizzle' });

    console.log(`reading ${jsonPath}`);
    const payload = JSON.parse(readFileSync(jsonPath, 'utf-8')) as RawPayload;

    let imported = 0;
    let skipped = 0;
    let excluded = 0;

    db.transaction((tx) => {
      for (const p of payload.places) {
        if (p.audit?.exclude_recommend) {
          excluded++;
          continue;
        }
        if (!p.location || !p.id) {
          skipped++;
          continue;
        }

        const row = {
          placeId: p.id,
          name: p.displayName?.text ?? '(unnamed)',
          address: p.formattedAddress ?? '',
          latitude: p.location.latitude,
          longitude: p.location.longitude,
          googleMapsUri: p.googleMapsUri ?? '',
          primaryType: p.primaryType ?? null,
          primaryTypeLabel: p.primaryTypeLabel ?? null,
          primaryTypeIcon: p.primaryTypeIcon ?? null,
          types: p.types ?? [],
          typesLabels: p.typesLabels ?? [],
          typesIcons: p.typesIcons ?? [],
          priceLevel: p.priceLevel ?? null,
          openingHours: p.regularOpeningHours ?? null,
          businessStatus: p.businessStatus ?? 'OPERATIONAL',
          source: 'seeded' as const,
          approvedAt: null,
        };

        // Upsert. Preserves firstSeenAt and any admin-override columns by
        // excluding them from the SET clause.
        tx.insert(restaurants)
          .values(row)
          .onConflictDoUpdate({
            target: restaurants.placeId,
            set: {
              name: row.name,
              address: row.address,
              latitude: row.latitude,
              longitude: row.longitude,
              googleMapsUri: row.googleMapsUri,
              primaryType: row.primaryType,
              primaryTypeLabel: row.primaryTypeLabel,
              primaryTypeIcon: row.primaryTypeIcon,
              types: row.types,
              typesLabels: row.typesLabels,
              typesIcons: row.typesIcons,
              priceLevel: row.priceLevel,
              openingHours: row.openingHours,
              businessStatus: row.businessStatus,
              updatedAt: new Date(),
            },
          })
          .run();

        imported++;
      }
    });

    console.log(
      `done — imported/upserted ${imported}, audit-excluded ${excluded}, skipped ${skipped}`,
    );
  } finally {
    close();
  }
}

main();
