import { desc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { authForWrite, badRequest, cleanDisplayName } from "@/lib/api";
import { getDb } from "@/src/db/client";
import { comments, restaurants } from "@/src/db/schema";

const BODY_MAX = 1000;

export async function GET(req: NextRequest): Promise<NextResponse> {
  // GET also requires full tier — read-only viewers don't see threads.
  const auth = await authForWrite();
  if (auth instanceof NextResponse) return auth;

  const placeId = req.nextUrl.searchParams.get("placeId");
  if (!placeId) return badRequest("place_id_required");

  const db = getDb();
  const rows = db
    .select({
      id: comments.id,
      placeId: comments.placeId,
      displayName: comments.displayName,
      body: comments.body,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      browserId: comments.browserId,
    })
    .from(comments)
    .where(eq(comments.placeId, placeId))
    .orderBy(desc(comments.createdAt))
    .all();

  // Flag the viewer's own comments so the client can show edit/delete.
  // Don't expose other users' browser_ids.
  return NextResponse.json({
    comments: rows.map((r) => ({
      id: r.id,
      placeId: r.placeId,
      displayName: r.displayName,
      body: r.body,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      mine: r.browserId === auth.browserId,
    })),
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authForWrite();
  if (auth instanceof NextResponse) return auth;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequest("invalid_json");
  }
  if (!raw || typeof raw !== "object") return badRequest("invalid_body");
  const { placeId, body, displayName } = raw as Record<string, unknown>;

  if (typeof placeId !== "string" || !placeId) return badRequest("place_id_required");
  if (typeof body !== "string") return badRequest("body_required");
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > BODY_MAX) return badRequest("body_invalid");
  const name = cleanDisplayName(displayName);
  if (!name.ok) return name.error;

  const db = getDb();
  const place = db
    .select({ placeId: restaurants.placeId })
    .from(restaurants)
    .where(eq(restaurants.placeId, placeId))
    .get();
  if (!place) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const inserted = db
    .insert(comments)
    .values({
      placeId,
      browserId: auth.browserId,
      displayName: name.value,
      body: trimmed,
    })
    .returning()
    .get();

  return NextResponse.json({
    comment: {
      id: inserted.id,
      placeId: inserted.placeId,
      displayName: inserted.displayName,
      body: inserted.body,
      createdAt: inserted.createdAt,
      updatedAt: inserted.updatedAt,
      mine: true,
    },
  });
}
