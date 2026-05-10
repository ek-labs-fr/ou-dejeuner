import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";
import { authForAdmin } from "@/lib/api";
import { getDb } from "@/src/db/client";
import {
  closureReports,
  comments,
  reactions,
  submissions,
  tagMarks,
} from "@/src/db/schema";

type Ctx = { params: Promise<{ browserId: string }> };

// Bulk-delete every piece of content posted by a single browser ID. The
// canonical clean-up after banning. Pending submissions are also marked
// withdrawn (not deleted) to preserve the audit trail.
export async function POST(_req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const auth = await authForAdmin();
  if (auth instanceof NextResponse) return auth;

  const { browserId } = await ctx.params;
  const db = getDb();

  let counts: Record<string, number> = {};
  db.transaction((tx) => {
    const c = tx
      .delete(comments)
      .where(eq(comments.browserId, browserId))
      .returning({ id: comments.id })
      .all();
    const r = tx
      .delete(reactions)
      .where(eq(reactions.browserId, browserId))
      .returning({ placeId: reactions.placeId })
      .all();
    const t = tx
      .delete(tagMarks)
      .where(eq(tagMarks.browserId, browserId))
      .returning({ placeId: tagMarks.placeId })
      .all();
    const cr = tx
      .delete(closureReports)
      .where(eq(closureReports.browserId, browserId))
      .returning({ id: closureReports.id })
      .all();
    const s = tx
      .update(submissions)
      .set({ status: "withdrawn", decidedAt: new Date() })
      .where(
        and(
          eq(submissions.browserId, browserId),
          eq(submissions.status, "pending"),
        ),
      )
      .returning({ id: submissions.id })
      .all();

    counts = {
      comments: c.length,
      reactions: r.length,
      tags: t.length,
      closureReports: cr.length,
      submissionsWithdrawn: s.length,
    };

    logAdminAction(tx, "ban.delete_content", {
      targetType: "ban",
      targetId: browserId,
      payload: counts,
    });
  });

  return NextResponse.json({ ok: true, counts });
}
