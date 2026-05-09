import { sql } from 'drizzle-orm';
import {
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

// SQLite has no array or jsonb types; arrays / structured objects are stored
// as JSON-encoded text. Drizzle's `mode: 'json'` handles the parse/stringify
// boundary so .ts code keeps working with proper types.

export type RegularOpeningHours = {
  openNow?: boolean;
  periods?: Array<{
    open: { day: number; hour: number; minute: number };
    close?: { day: number; hour: number; minute: number };
  }>;
  weekdayDescriptions?: string[];
};

// Three-state knob used by every admin override: keep the user-derived value,
// or pin it on / off regardless of colleague tags.
export type OverrideState = 'auto' | 'on' | 'off';

export const restaurants = sqliteTable('restaurants', {
  placeId: text('place_id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  googleMapsUri: text('google_maps_uri').notNull(),
  primaryType: text('primary_type'),
  primaryTypeLabel: text('primary_type_label'),
  primaryTypeIcon: text('primary_type_icon'),
  types: text('types', { mode: 'json' }).$type<string[]>().notNull().default([]),
  typesLabels: text('types_labels', { mode: 'json' }).$type<string[]>().notNull().default([]),
  typesIcons: text('types_icons', { mode: 'json' }).$type<string[]>().notNull().default([]),
  priceLevel: text('price_level'),
  openingHours: text('opening_hours', { mode: 'json' }).$type<RegularOpeningHours | null>(),
  businessStatus: text('business_status').notNull(),

  // Provenance: 'seeded' (one-off Google Places seed) vs 'submitted' (colleague submission).
  // approvedAt is null for seeded entries; for submitted entries it's the admin-approval
  // timestamp and drives the 3-month 🌱 New badge window.
  source: text('source', { enum: ['seeded', 'submitted'] }).notNull(),
  approvedAt: integer('approved_at', { mode: 'timestamp' }),

  // Admin overrides.
  isHidden: integer('is_hidden', { mode: 'boolean' }).notNull().default(false),
  newBadgeOverride: text('new_badge_override', { enum: ['auto', 'on', 'off'] })
    .$type<OverrideState>().notNull().default('auto'),
  overrideDineIn: text('override_dine_in', { enum: ['auto', 'on', 'off'] })
    .$type<OverrideState>().notNull().default('auto'),
  overrideTakeaway: text('override_takeaway', { enum: ['auto', 'on', 'off'] })
    .$type<OverrideState>().notNull().default('auto'),
  overrideVegetarian: text('override_vegetarian', { enum: ['auto', 'on', 'off'] })
    .$type<OverrideState>().notNull().default('auto'),
  overrideHalal: text('override_halal', { enum: ['auto', 'on', 'off'] })
    .$type<OverrideState>().notNull().default('auto'),

  firstSeenAt: integer('first_seen_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Restaurant = typeof restaurants.$inferSelect;
export type NewRestaurant = typeof restaurants.$inferInsert;

// One reaction per (browser, restaurant). Mutual exclusion of love/like is
// enforced by the (browserId, placeId) primary key — switching kinds is an
// UPDATE; clicking the same kind again is a DELETE.
export const reactions = sqliteTable(
  'reactions',
  {
    browserId: text('browser_id').notNull(),
    placeId: text('place_id')
      .notNull()
      .references(() => restaurants.placeId, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['love', 'like'] }).notNull(),
    displayName: text('display_name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({ pk: primaryKey({ columns: [t.browserId, t.placeId] }) }),
);

// Tag attribute identifiers — kept in one place so the admin-override columns
// on `restaurants` and the per-tag write APIs reference the same names.
export const TAG_ATTRIBUTES = [
  'dine_in',
  'takeaway',
  'vegetarian',
  'halal',
  'express',
  'business',
  'large_groups',
] as const;
export type TagAttribute = (typeof TAG_ATTRIBUTES)[number];

// One row per (browser, restaurant, attribute). Re-toggling deletes the row.
export const tagMarks = sqliteTable(
  'tag_marks',
  {
    browserId: text('browser_id').notNull(),
    placeId: text('place_id')
      .notNull()
      .references(() => restaurants.placeId, { onDelete: 'cascade' }),
    attribute: text('attribute', { enum: TAG_ATTRIBUTES })
      .$type<TagAttribute>()
      .notNull(),
    displayName: text('display_name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({ pk: primaryKey({ columns: [t.browserId, t.placeId, t.attribute] }) }),
);

export const comments = sqliteTable('comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  placeId: text('place_id')
    .notNull()
    .references(() => restaurants.placeId, { onDelete: 'cascade' }),
  browserId: text('browser_id').notNull(),
  displayName: text('display_name').notNull(),
  body: text('body').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

// Colleague submissions of new restaurants. Approval triggers the Place Details
// API call (~$0.02) and resolves to a placeId. Withdrawn / rejected submissions
// never trigger a call.
export const submissions = sqliteTable('submissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  browserId: text('browser_id').notNull(),
  displayName: text('display_name').notNull(),
  sourceUrl: text('source_url'),
  nameInput: text('name_input'),
  addressInput: text('address_input'),
  status: text('status', {
    enum: ['pending', 'approved', 'rejected', 'withdrawn'],
  })
    .notNull()
    .default('pending'),
  resolvedPlaceId: text('resolved_place_id').references(
    () => restaurants.placeId,
    { onDelete: 'set null' },
  ),
  rejectReason: text('reject_reason'),
  submittedAt: integer('submitted_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  decidedAt: integer('decided_at', { mode: 'timestamp' }),
});

export const closureReports = sqliteTable('closure_reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  placeId: text('place_id')
    .notNull()
    .references(() => restaurants.placeId, { onDelete: 'cascade' }),
  browserId: text('browser_id').notNull(),
  displayName: text('display_name').notNull(),
  issueType: text('issue_type', { enum: ['closed', 'not_lunch', 'incorrect_info', 'other'] })
    .notNull()
    .default('closed'),
  note: text('note'),
  status: text('status', { enum: ['open', 'hidden', 'dismissed'] })
    .notNull()
    .default('open'),
  reportedAt: integer('reported_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
});

export const bannedBrowserIds = sqliteTable('banned_browser_ids', {
  browserId: text('browser_id').primaryKey(),
  reason: text('reason'),
  bannedAt: integer('banned_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});
