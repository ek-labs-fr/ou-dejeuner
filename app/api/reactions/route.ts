import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { authForWrite, badRequest, cleanDisplayName } from "@/lib/api";
import { getDb } from "@/src/db/client";
import { reactions, restaurants } from "@/src/db/schema";

const KINDS = ["love", "like"] as const;
type Kind = (typeof KINDS)[number];

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authForWrite();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("invalid_json");
  }
  if (!body || typeof body !== "object") return badRequest("invalid_body");
  const { placeId, kind, displayName } = body as Record<string, unknown>;

  if (typeof placeId !== "string" || !placeId) return badRequest("place_id_required");
  if (typeof kind !== "string" || !(KINDS as readonly string[]).includes(kind)) {
    return badRequest("invalid_kind");
  }
  const name = cleanDisplayName(displayName);
  if (!name.ok) return name.error;

  const db = getDb();
  const place = db
    .select({ placeId: restaurants.placeId })
    .from(restaurants)
    .where(eq(restaurants.placeId, placeId))
    .get();
  if (!place) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const where = and(
    eq(reactions.browserId, auth.browserId),
    eq(reactions.placeId, placeId),
  );

  const existing = db.select().from(reactions).where(where).get();

  // Toggle semantics per spec: same kind → clear; different kind → switch;
  // none → set.
  let next: Kind | null;
  if (!existing) {
    db.insert(reactions)
      .values({
        browserId: auth.browserId,
        placeId,
        kind: kind as Kind,
        displayName: name.value,
      })
      .run();
    next = kind as Kind;
  } else if (existing.kind === kind) {
    db.delete(reactions).where(where).run();
    next = null;
  } else {
    db.update(reactions)
      .set({
        kind: kind as Kind,
        displayName: name.value,
        updatedAt: new Date(),
      })
      .where(where)
      .run();
    next = kind as Kind;
  }

  return NextResponse.json({ state: next });
}
