import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { authForWrite, badRequest } from "@/lib/api";
import { getDb } from "@/src/db/client";
import { submissions } from "@/src/db/schema";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Withdraw is a soft-delete (status -> 'withdrawn') rather than a row drop:
// the submissions table's enum explicitly carries the state, and keeping the
// row preserves the audit trail Part B will read from.
export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const auth = await authForWrite();
  if (auth instanceof NextResponse) return auth;

  const { id: rawId } = await ctx.params;
  const id = parseId(rawId);
  if (id === null) return badRequest("invalid_id");

  const db = getDb();
  const where = and(
    eq(submissions.id, id),
    eq(submissions.browserId, auth.browserId),
    eq(submissions.status, "pending"),
  );
  const updated = db
    .update(submissions)
    .set({ status: "withdrawn", decidedAt: new Date() })
    .where(where)
    .returning()
    .get();

  if (!updated) {
    const exists = db
      .select({ id: submissions.id, status: submissions.status, browserId: submissions.browserId })
      .from(submissions)
      .where(eq(submissions.id, id))
      .get();
    if (!exists) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (exists.browserId !== auth.browserId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    // Belongs to the user but already approved/rejected/withdrawn.
    return NextResponse.json({ error: "not_pending" }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
