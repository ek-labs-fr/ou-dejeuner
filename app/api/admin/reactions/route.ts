import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";
import { authForAdmin, badRequest } from "@/lib/api";
import { getDb } from "@/src/db/client";
import { reactions } from "@/src/db/schema";

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
  if (!browserId || !placeId) return badRequest("browser_id_and_place_id_required");

  const db = getDb();
  let deleted = false;
  db.transaction((tx) => {
    const row = tx
      .delete(reactions)
      .where(and(eq(reactions.browserId, browserId), eq(reactions.placeId, placeId)))
      .returning()
      .get();
    deleted = row != null;
    if (deleted) {
      logAdminAction(tx, "reaction.delete", {
        targetType: "reaction",
        targetId: `${browserId}:${placeId}`,
        payload: row ? { kind: row.kind } : null,
      });
    }
  });

  if (!deleted) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
