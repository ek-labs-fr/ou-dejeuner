import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";
import { authForAdmin, badRequest } from "@/lib/api";
import { getDb } from "@/src/db/client";
import { TAG_ATTRIBUTES, type TagAttribute, tagMarks } from "@/src/db/schema";

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const auth = await authForAdmin();
  if (auth instanceof NextResponse) return auth;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return badRequest("invalid_json");
  }
  const browserId = typeof body.browserId === "string" ? body.browserId : "";
  const placeId = typeof body.placeId === "string" ? body.placeId : "";
  const attribute = typeof body.attribute === "string" ? body.attribute : "";
  if (!browserId || !placeId || !attribute) return badRequest("missing_keys");
  if (!(TAG_ATTRIBUTES as readonly string[]).includes(attribute)) {
    return badRequest("invalid_attribute");
  }

  const db = getDb();
  let deleted = false;
  db.transaction((tx) => {
    const row = tx
      .delete(tagMarks)
      .where(
        and(
          eq(tagMarks.browserId, browserId),
          eq(tagMarks.placeId, placeId),
          eq(tagMarks.attribute, attribute as TagAttribute),
        ),
      )
      .returning()
      .get();
    deleted = row != null;
    if (deleted) {
      logAdminAction(tx, "tag.delete", {
        targetType: "tag",
        targetId: `${browserId}:${placeId}:${attribute}`,
        payload: { attribute },
      });
    }
  });

  if (!deleted) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
