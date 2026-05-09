import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getDb } from "@/src/db/client";
import { bannedBrowserIds } from "@/src/db/schema";

import { GATE_COOKIE_NAME, verifyGateCookie } from "./gate";
import { BROWSER_ID_COOKIE } from "./identity";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Authed = { browserId: string };

// Used at the top of every write route. Returns either the resolved auth
// context or a NextResponse to return immediately.
export async function authForWrite(): Promise<Authed | NextResponse> {
  const c = await cookies();

  const gate = c.get(GATE_COOKIE_NAME)?.value;
  const payload = gate ? await verifyGateCookie(gate) : null;
  if (!payload) {
    return NextResponse.json({ error: "gate_required" }, { status: 401 });
  }
  if (payload.tier !== "full") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const browserId = c.get(BROWSER_ID_COOKIE)?.value;
  if (!browserId || !UUID_RE.test(browserId)) {
    return NextResponse.json(
      { error: "browser_id_required" },
      { status: 400 },
    );
  }

  const db = getDb();
  const banned = db
    .select()
    .from(bannedBrowserIds)
    .where(eq(bannedBrowserIds.browserId, browserId))
    .get();
  if (banned) {
    return NextResponse.json({ error: "banned" }, { status: 403 });
  }

  return { browserId };
}

const DISPLAY_NAME_MAX = 40;

export type CleanDisplayName =
  | { ok: true; value: string }
  | { ok: false; error: NextResponse };

// Trim, length-check, and reject empty. The client should prompt before
// sending if it isn't already in localStorage; this is the server-side belt
// in case it skipped that.
export function cleanDisplayName(raw: unknown): CleanDisplayName {
  if (typeof raw !== "string") {
    return {
      ok: false,
      error: NextResponse.json(
        { error: "display_name_required" },
        { status: 400 },
      ),
    };
  }
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > DISPLAY_NAME_MAX) {
    return {
      ok: false,
      error: NextResponse.json(
        { error: "display_name_required" },
        { status: 400 },
      ),
    };
  }
  return { ok: true, value: trimmed };
}

export function badRequest(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 400 });
}
