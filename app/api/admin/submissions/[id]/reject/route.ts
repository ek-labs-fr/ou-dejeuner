import { NextResponse, type NextRequest } from "next/server";

import { rejectSubmission } from "@/lib/admin-approve";
import { authForAdmin, badRequest } from "@/lib/api";
import { getDb } from "@/src/db/client";

type Ctx = { params: Promise<{ id: string }> };
const REASON_MAX = 280;

function parseId(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function POST(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const auth = await authForAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id: rawId } = await ctx.params;
  const id = parseId(rawId);
  if (id === null) return badRequest("invalid_id");

  let reason: string | null = null;
  try {
    const body = (await req.json()) as { reason?: unknown } | null;
    if (body && typeof body.reason === "string") {
      const trimmed = body.reason.trim().slice(0, REASON_MAX);
      reason = trimmed || null;
    }
  } catch {
    // No body / invalid JSON is fine — reason is optional.
  }

  const result = rejectSubmission(getDb(), id, reason);
  if (!result.ok) {
    const status =
      result.error === "not_found" ? 404 :
      result.error === "not_pending" ? 409 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
