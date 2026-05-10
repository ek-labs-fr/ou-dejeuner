import { NextResponse, type NextRequest } from "next/server";

import { rejectSubmission } from "@/lib/admin-approve";
import { logAdminAction } from "@/lib/admin-audit";
import { authForAdmin, badRequest } from "@/lib/api";
import { getDb } from "@/src/db/client";

const MAX_BULK = 25;
const REASON_MAX = 280;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authForAdmin();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("invalid_json");
  }
  if (!body || typeof body !== "object") return badRequest("invalid_body");
  const { ids, reason } = body as { ids?: unknown; reason?: unknown };
  if (!Array.isArray(ids)) return badRequest("ids_required");
  if (ids.length === 0) return badRequest("ids_empty");
  if (ids.length > MAX_BULK) return badRequest("too_many");

  const cleanIds: number[] = [];
  for (const v of ids) {
    if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) {
      return badRequest("invalid_id_in_list");
    }
    cleanIds.push(v);
  }

  let cleanReason: string | null = null;
  if (typeof reason === "string") {
    const trimmed = reason.trim().slice(0, REASON_MAX);
    cleanReason = trimmed || null;
  }

  const db = getDb();
  const results = cleanIds.map((id) => ({
    submissionId: id,
    ...rejectSubmission(db, id, cleanReason),
  }));
  const okCount = results.filter((r) => r.ok).length;

  db.transaction((tx) => {
    logAdminAction(tx, "submission.bulk_reject", {
      payload: {
        requested: cleanIds.length,
        succeeded: okCount,
        failed: results.length - okCount,
        reason: cleanReason,
      },
    });
  });

  return NextResponse.json({ results });
}
