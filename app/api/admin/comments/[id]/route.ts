import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";
import { authForAdmin, badRequest } from "@/lib/api";
import { getDb } from "@/src/db/client";
import { comments } from "@/src/db/schema";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const auth = await authForAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id: rawId } = await ctx.params;
  const id = parseId(rawId);
  if (id === null) return badRequest("invalid_id");

  const db = getDb();
  let deleted = false;
  db.transaction((tx) => {
    const row = tx.delete(comments).where(eq(comments.id, id)).returning().get();
    deleted = row != null;
    if (deleted) {
      logAdminAction(tx, "comment.delete", {
        targetType: "comment",
        targetId: id,
        payload: row ? { placeId: row.placeId, browserId: row.browserId } : null,
      });
    }
  });

  if (!deleted) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
