import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";
import { authForAdmin, badRequest } from "@/lib/api";
import { getDb } from "@/src/db/client";
import { closureReports, restaurants } from "@/src/db/schema";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// PATCH body: { action: 'dismiss' | 'resolve_by_hiding' }
export async function PATCH(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const auth = await authForAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id: rawId } = await ctx.params;
  const id = parseId(rawId);
  if (id === null) return badRequest("invalid_id");

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return badRequest("invalid_json");
  }
  const action = typeof body.action === "string" ? body.action : "";
  if (action !== "dismiss" && action !== "resolve_by_hiding") {
    return badRequest("invalid_action");
  }

  const db = getDb();
  const report = db
    .select()
    .from(closureReports)
    .where(eq(closureReports.id, id))
    .get();
  if (!report) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (report.status !== "open") {
    return NextResponse.json({ error: "not_open" }, { status: 409 });
  }

  db.transaction((tx) => {
    if (action === "resolve_by_hiding") {
      tx.update(restaurants)
        .set({ isHidden: true, updatedAt: new Date() })
        .where(eq(restaurants.placeId, report.placeId))
        .run();
      tx.update(closureReports)
        .set({ status: "hidden", resolvedAt: new Date() })
        .where(eq(closureReports.id, id))
        .run();
      logAdminAction(tx, "closure_report.resolve_by_hiding", {
        targetType: "closure_report",
        targetId: id,
        payload: { placeId: report.placeId, issueType: report.issueType },
      });
    } else {
      tx.update(closureReports)
        .set({ status: "dismissed", resolvedAt: new Date() })
        .where(eq(closureReports.id, id))
        .run();
      logAdminAction(tx, "closure_report.dismiss", {
        targetType: "closure_report",
        targetId: id,
        payload: { placeId: report.placeId, issueType: report.issueType },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
