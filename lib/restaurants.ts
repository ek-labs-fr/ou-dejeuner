import { eq, sql } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import {
  comments,
  reactions,
  restaurants as restaurantsTable,
  tagMarks,
  TAG_ATTRIBUTES,
  type TagAttribute,
} from "@/src/db/schema";

import {
  EMPTY_MY_STATE,
  type MyState,
  type PriceLevel,
  type Restaurant,
} from "./restaurant-types";
import { compassFromOffice, MAX_WALK_MIN, walkMinutesFromOffice } from "./walking";

// Re-export the pure types/utils so existing consumers (server components)
// don't need to know about the split. Client components must import from
// `@/lib/restaurant-types` directly to avoid bundling better-sqlite3.
export {
  EMPTY_MY_STATE,
  priceLevelToSymbol,
} from "./restaurant-types";
export type {
  MyState,
  PriceLevel,
  Restaurant,
} from "./restaurant-types";

const GENERIC_TYPES = new Set([
  "restaurant",
  "food",
  "store",
  "food_store",
  "point_of_interest",
  "establishment",
  "service",
  "meal_takeaway",
  "meal_delivery",
  "catering_service",
]);

function resolveDisplayType(row: {
  primaryType: string | null;
  primaryTypeLabel: string | null;
  primaryTypeIcon: string | null;
  types: string[];
  typesLabels: string[];
  typesIcons: string[];
}): { label: string; icon: string } {
  const fallbackLabel = row.primaryTypeLabel ?? "Restaurant";
  const fallbackIcon = row.primaryTypeIcon ?? "🍽️";

  if (row.primaryType !== "restaurant") {
    return { label: fallbackLabel, icon: fallbackIcon };
  }

  const pickAt = (i: number) => ({
    label: row.typesLabels[i] ?? fallbackLabel,
    icon: row.typesIcons[i] ?? fallbackIcon,
  });

  for (let i = 0; i < row.types.length; i++) {
    const t = row.types[i];
    if (t && t.endsWith("_restaurant")) return pickAt(i);
  }
  for (let i = 0; i < row.types.length; i++) {
    const t = row.types[i];
    if (t && !GENERIC_TYPES.has(t)) return pickAt(i);
  }
  return { label: fallbackLabel, icon: fallbackIcon };
}

type TagCounts = Record<TagAttribute, number>;
const ZERO_TAG_COUNTS: TagCounts = {
  dine_in: 0,
  takeaway: 0,
  vegetarian: 0,
  halal: 0,
  express: 0,
  business: 0,
  large_groups: 0,
};

// One read of the catalogue plus three GROUP BY queries for aggregates,
// plus two more if a browser ID is given (for the viewer's own reaction +
// tag state). At 3k places + ~50 colleagues these are a few ms each — no
// caching layer needed yet. Re-run on every request so writes show up
// immediately.
export function getRestaurants(browserId?: string | null): Restaurant[] {
  const db = getDb();

  const rows = db
    .select()
    .from(restaurantsTable)
    .where(eq(restaurantsTable.isHidden, false))
    .all();

  const reactionRows = db
    .select({
      placeId: reactions.placeId,
      kind: reactions.kind,
      n: sql<number>`count(*)`.as("n"),
    })
    .from(reactions)
    .groupBy(reactions.placeId, reactions.kind)
    .all();

  const tagRows = db
    .select({
      placeId: tagMarks.placeId,
      attribute: tagMarks.attribute,
      n: sql<number>`count(*)`.as("n"),
    })
    .from(tagMarks)
    .groupBy(tagMarks.placeId, tagMarks.attribute)
    .all();

  const commentRows = db
    .select({
      placeId: comments.placeId,
      n: sql<number>`count(*)`.as("n"),
    })
    .from(comments)
    .groupBy(comments.placeId)
    .all();

  const reactionsByPlace = new Map<string, { love: number; like: number }>();
  for (const r of reactionRows) {
    let entry = reactionsByPlace.get(r.placeId);
    if (!entry) {
      entry = { love: 0, like: 0 };
      reactionsByPlace.set(r.placeId, entry);
    }
    if (r.kind === "love") entry.love = Number(r.n);
    if (r.kind === "like") entry.like = Number(r.n);
  }

  const tagsByPlace = new Map<string, TagCounts>();
  for (const t of tagRows) {
    let entry = tagsByPlace.get(t.placeId);
    if (!entry) {
      entry = { ...ZERO_TAG_COUNTS };
      tagsByPlace.set(t.placeId, entry);
    }
    entry[t.attribute] = Number(t.n);
  }

  const commentsByPlace = new Map<string, number>();
  for (const c of commentRows) commentsByPlace.set(c.placeId, Number(c.n));

  const myReactionByPlace = new Map<string, "love" | "like">();
  const myTagsByPlace = new Map<string, Set<TagAttribute>>();
  if (browserId) {
    const myReactions = db
      .select({ placeId: reactions.placeId, kind: reactions.kind })
      .from(reactions)
      .where(eq(reactions.browserId, browserId))
      .all();
    for (const r of myReactions) myReactionByPlace.set(r.placeId, r.kind);

    const myTags = db
      .select({ placeId: tagMarks.placeId, attribute: tagMarks.attribute })
      .from(tagMarks)
      .where(eq(tagMarks.browserId, browserId))
      .all();
    for (const t of myTags) {
      let s = myTagsByPlace.get(t.placeId);
      if (!s) {
        s = new Set();
        myTagsByPlace.set(t.placeId, s);
      }
      s.add(t.attribute);
    }
  }

  const result: Restaurant[] = rows.map((row) => {
    const display = resolveDisplayType({
      primaryType: row.primaryType,
      primaryTypeLabel: row.primaryTypeLabel,
      primaryTypeIcon: row.primaryTypeIcon,
      types: row.types ?? [],
      typesLabels: row.typesLabels ?? [],
      typesIcons: row.typesIcons ?? [],
    });

    const tagCounts = tagsByPlace.get(row.placeId) ?? ZERO_TAG_COUNTS;
    const rxn = reactionsByPlace.get(row.placeId) ?? { love: 0, like: 0 };
    const myReaction = myReactionByPlace.get(row.placeId) ?? null;
    const myTags = myTagsByPlace.get(row.placeId);
    const my: MyState = {
      reaction: myReaction,
      tags: { ...EMPTY_MY_STATE.tags },
    };
    if (myTags) {
      for (const t of TAG_ATTRIBUTES) my.tags[t] = myTags.has(t);
    }

    return {
      id: row.placeId,
      name: row.name,
      address: (row.address ?? "").replace(/,\s*France\s*$/i, ""),
      lat: row.latitude,
      lng: row.longitude,
      googleMapsUri: row.googleMapsUri,
      primaryTypeLabel: display.label,
      primaryTypeIcon: display.icon,
      priceLevel: (row.priceLevel as PriceLevel | null) ?? null,
      walkMin: walkMinutesFromOffice(row.latitude, row.longitude),
      direction: compassFromOffice(row.latitude, row.longitude),
      loveCount: rxn.love,
      likeCount: rxn.like,
      commentCount: commentsByPlace.get(row.placeId) ?? 0,
      dineInCount: tagCounts.dine_in,
      takeawayCount: tagCounts.takeaway,
      vegCount: tagCounts.vegetarian,
      halalCount: tagCounts.halal,
      expressCount: tagCounts.express,
      businessCount: tagCounts.business,
      largeGroupCount: tagCounts.large_groups,
      approvedAt: row.approvedAt,
      source: row.source,
      my,
    };
  });

  return result.filter((r) => r.walkMin <= MAX_WALK_MIN);
}
