// Manual approval: the admin fills in the restaurant data themselves
// (deliberately bypassing Google Places API to keep recurring spend at $0).
// If they paste a real ChIJ-style place_id, we use it as the PK so the
// upsert deduplicates against any existing seeded or approved row;
// otherwise we synthesise `manual_<uuid>`.

import { eq } from "drizzle-orm";

import { logAdminAction } from "@/lib/admin-audit";
import { humanizeType, typeIcon } from "@/lib/places-labels";
import type { Db } from "@/src/db/client";
import { restaurants, submissions } from "@/src/db/schema";

export type ApproveFields = {
  placeId?: string | null;
  name: string;
  address: string;
  googleMapsUri: string;
  latitude: number;
  longitude: number;
  primaryType?: string | null;
  priceLevel?: string | null;
};

export type ApproveResult =
  | { ok: true; submissionId: number; placeId: string; merged: boolean }
  | { ok: false; submissionId: number; error: string };

function genManualPlaceId(): string {
  return `manual_${crypto.randomUUID()}`;
}

export function manualApproveSubmission(
  db: Db,
  submissionId: number,
  fields: ApproveFields,
): ApproveResult {
  const sub = db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .get();
  if (!sub) return { ok: false, submissionId, error: "not_found" };
  if (sub.status !== "pending") {
    return { ok: false, submissionId, error: "not_pending" };
  }

  const placeId = (fields.placeId?.trim() || "") || genManualPlaceId();

  const existing = db
    .select({ placeId: restaurants.placeId })
    .from(restaurants)
    .where(eq(restaurants.placeId, placeId))
    .get();
  const merged = existing != null;

  const types = fields.primaryType ? [fields.primaryType] : [];
  const row = {
    placeId,
    name: fields.name,
    address: fields.address,
    latitude: fields.latitude,
    longitude: fields.longitude,
    googleMapsUri: fields.googleMapsUri,
    primaryType: fields.primaryType ?? null,
    primaryTypeLabel: fields.primaryType ? humanizeType(fields.primaryType) : null,
    primaryTypeIcon: fields.primaryType ? typeIcon(fields.primaryType) : null,
    types,
    typesLabels: types.map(humanizeType),
    typesIcons: types.map(typeIcon),
    priceLevel: fields.priceLevel ?? null,
    openingHours: null,
    businessStatus: "OPERATIONAL",
  };

  db.transaction((tx) => {
    if (merged) {
      tx.update(restaurants)
        .set({
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
          updatedAt: new Date(),
        })
        .where(eq(restaurants.placeId, placeId))
        .run();
    } else {
      tx.insert(restaurants)
        .values({
          ...row,
          source: "submitted",
          approvedAt: new Date(),
        })
        .run();
    }

    tx.update(submissions)
      .set({
        status: "approved",
        decidedAt: new Date(),
        resolvedPlaceId: placeId,
      })
      .where(eq(submissions.id, submissionId))
      .run();

    logAdminAction(tx, "submission.approve", {
      targetType: "submission",
      targetId: submissionId,
      payload: { placeId, merged },
    });
  });

  return { ok: true, submissionId, placeId, merged };
}

export function rejectSubmission(
  db: Db,
  submissionId: number,
  reason: string | null,
): { ok: true } | { ok: false; error: string } {
  const sub = db
    .select({ id: submissions.id, status: submissions.status })
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .get();
  if (!sub) return { ok: false, error: "not_found" };
  if (sub.status !== "pending") return { ok: false, error: "not_pending" };

  db.transaction((tx) => {
    tx.update(submissions)
      .set({
        status: "rejected",
        decidedAt: new Date(),
        rejectReason: reason,
      })
      .where(eq(submissions.id, submissionId))
      .run();

    logAdminAction(tx, "submission.reject", {
      targetType: "submission",
      targetId: submissionId,
      payload: { reason },
    });
  });

  return { ok: true };
}
