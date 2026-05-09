import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { authForWrite, badRequest } from "@/lib/api";
import { getDb } from "@/src/db/client";
import { comments } from "@/src/db/schema";

const BODY_MAX = 1000;

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function PATCH(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const auth = await authForWrite();
  if (auth instanceof NextResponse) return auth;

  const { id: rawId } = await ctx.params;
  const id = parseId(rawId);
  if (id === null) return badRequest("invalid_id");

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequest("invalid_json");
  }
  if (!raw || typeof raw !== "object") return badRequest("invalid_body");
  const { body } = raw as Record<string, unknown>;
  if (typeof body !== "string") return badRequest("body_required");
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > BODY_MAX) return badRequest("body_invalid");

  const db = getDb();
  // Only the author (matched by browser ID) can edit. Updates from other
  // browsers return 403, never silently no-op — matches the spec's "edit
  // your own from the browser you posted from".
  const where = and(eq(comments.id, id), eq(comments.browserId, auth.browserId));
  const updated = db
    .update(comments)
    .set({ body: trimmed, updatedAt: new Date() })
    .where(where)
    .returning()
    .get();

  if (!updated) {
    // Distinguish missing vs not-yours so the client can react appropriately.
    const exists = db
      .select({ id: comments.id })
      .from(comments)
      .where(eq(comments.id, id))
      .get();
    return NextResponse.json(
      { error: exists ? "forbidden" : "not_found" },
      { status: exists ? 403 : 404 },
    );
  }

  return NextResponse.json({
    comment: {
      id: updated.id,
      placeId: updated.placeId,
      displayName: updated.displayName,
      body: updated.body,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      mine: true,
    },
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const auth = await authForWrite();
  if (auth instanceof NextResponse) return auth;

  const { id: rawId } = await ctx.params;
  const id = parseId(rawId);
  if (id === null) return badRequest("invalid_id");

  const db = getDb();
  const where = and(eq(comments.id, id), eq(comments.browserId, auth.browserId));
  const deleted = db.delete(comments).where(where).returning().get();

  if (!deleted) {
    const exists = db
      .select({ id: comments.id })
      .from(comments)
      .where(eq(comments.id, id))
      .get();
    return NextResponse.json(
      { error: exists ? "forbidden" : "not_found" },
      { status: exists ? 403 : 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
