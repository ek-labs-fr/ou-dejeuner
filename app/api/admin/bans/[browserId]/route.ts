import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";
import { authForAdmin } from "@/lib/api";
import { getDb } from "@/src/db/client";
import { bannedBrowserIds } from "@/src/db/schema";

type Ctx = { params: Promise<{ browserId: string }> };

export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const auth = await authForAdmin();
  if (auth instanceof NextResponse) return auth;

  const { browserId } = await ctx.params;
  const db = getDb();
  let removed = false;
  db.transaction((tx) => {
    const row = tx
      .delete(bannedBrowserIds)
      .where(eq(bannedBrowserIds.browserId, browserId))
      .returning()
      .get();
    removed = row != null;
    if (removed) {
      logAdminAction(tx, "ban.remove", {
        targetType: "ban",
        targetId: browserId,
      });
    }
  });

  if (!removed) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
