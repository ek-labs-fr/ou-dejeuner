import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";
import { authForAdmin, badRequest } from "@/lib/api";
import { getDb } from "@/src/db/client";
import { bannedBrowserIds } from "@/src/db/schema";

const REASON_MAX = 280;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authForAdmin();
  if (auth instanceof NextResponse) return auth;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return badRequest("invalid_json");
  }
  const browserId = typeof body.browserId === "string" ? body.browserId : "";
  if (!browserId) return badRequest("browser_id_required");
  const reason =
    typeof body.reason === "string"
      ? body.reason.trim().slice(0, REASON_MAX) || null
      : null;

  const db = getDb();
  db.transaction((tx) => {
    tx.insert(bannedBrowserIds)
      .values({ browserId, reason })
      .onConflictDoUpdate({
        target: bannedBrowserIds.browserId,
        set: { reason },
      })
      .run();
    logAdminAction(tx, "ban.create", {
      targetType: "ban",
      targetId: browserId,
      payload: { reason },
    });
  });

  return NextResponse.json({ ok: true });
}
