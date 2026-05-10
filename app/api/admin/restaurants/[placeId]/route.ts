import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";
import { authForAdmin, badRequest } from "@/lib/api";
import { getDb } from "@/src/db/client";
import type { AdminAuditAction, OverrideState } from "@/src/db/schema";
import { restaurants } from "@/src/db/schema";

type Ctx = { params: Promise<{ placeId: string }> };

const OVERRIDE_VALUES: ReadonlySet<OverrideState> = new Set(["auto", "on", "off"]);
const TAG_OVERRIDE_FIELDS = {
  dine_in: "overrideDineIn",
  takeaway: "overrideTakeaway",
  vegetarian: "overrideVegetarian",
  halal: "overrideHalal",
} as const;
type TagOverrideKey = keyof typeof TAG_OVERRIDE_FIELDS;

export async function PATCH(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const auth = await authForAdmin();
  if (auth instanceof NextResponse) return auth;

  const { placeId } = await ctx.params;
  if (!placeId) return badRequest("place_id_required");

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return badRequest("invalid_json");
  }
  if (!body || typeof body !== "object") return badRequest("invalid_body");

  const db = getDb();
  const existing = db
    .select()
    .from(restaurants)
    .where(eq(restaurants.placeId, placeId))
    .get();
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const auditEntries: Array<{
    action: AdminAuditAction;
    payload: Record<string, unknown>;
  }> = [];

  if ("isHidden" in body) {
    const next = Boolean(body.isHidden);
    if (next !== existing.isHidden) {
      updates.isHidden = next;
      auditEntries.push({
        action: "restaurant.set_hidden",
        payload: { from: existing.isHidden, to: next },
      });
    }
  }

  if ("newBadgeOverride" in body) {
    const v = body.newBadgeOverride;
    if (typeof v !== "string" || !OVERRIDE_VALUES.has(v as OverrideState)) {
      return badRequest("invalid_new_badge_override");
    }
    if (v !== existing.newBadgeOverride) {
      updates.newBadgeOverride = v;
      auditEntries.push({
        action: "restaurant.set_new_badge_override",
        payload: { from: existing.newBadgeOverride, to: v },
      });
    }
  }

  if ("tagOverride" in body) {
    const tag = body.tagOverride as { attribute?: unknown; value?: unknown };
    if (!tag || typeof tag !== "object") return badRequest("invalid_tag_override");
    const attr = tag.attribute;
    const value = tag.value;
    if (
      typeof attr !== "string" ||
      !(attr in TAG_OVERRIDE_FIELDS) ||
      typeof value !== "string" ||
      !OVERRIDE_VALUES.has(value as OverrideState)
    ) {
      return badRequest("invalid_tag_override");
    }
    const dbField = TAG_OVERRIDE_FIELDS[attr as TagOverrideKey];
    const prev = existing[dbField];
    if (value !== prev) {
      updates[dbField] = value;
      auditEntries.push({
        action: "restaurant.set_tag_override",
        payload: { attribute: attr, from: prev, to: value },
      });
    }
  }

  if (auditEntries.length === 0) {
    return NextResponse.json({ ok: true, noop: true });
  }

  db.transaction((tx) => {
    tx.update(restaurants)
      .set(updates)
      .where(eq(restaurants.placeId, placeId))
      .run();
    for (const e of auditEntries) {
      logAdminAction(tx, e.action, {
        targetType: "restaurant",
        targetId: placeId,
        payload: e.payload,
      });
    }
  });

  return NextResponse.json({ ok: true });
}

// Hard-delete a restaurant. FK cascades take care of dependent rows
// (reactions, tags, comments, closure_reports). Approved submissions
// pointing here get their `resolved_place_id` nulled out but the
// submission row stays for audit history.
export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const auth = await authForAdmin();
  if (auth instanceof NextResponse) return auth;

  const { placeId } = await ctx.params;
  if (!placeId) return badRequest("place_id_required");

  const db = getDb();
  const snapshot = db.transaction((tx) => {
    const row = tx
      .delete(restaurants)
      .where(eq(restaurants.placeId, placeId))
      .returning({ name: restaurants.name, source: restaurants.source })
      .get();
    if (!row) return null;
    logAdminAction(tx, "restaurant.delete", {
      targetType: "restaurant",
      targetId: placeId,
      payload: { name: row.name, source: row.source },
    });
    return row;
  });

  if (!snapshot) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, name: snapshot.name, source: snapshot.source });
}
