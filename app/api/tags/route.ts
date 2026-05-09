import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { authForWrite, badRequest, cleanDisplayName } from "@/lib/api";
import { getDb } from "@/src/db/client";
import {
  restaurants,
  tagMarks,
  TAG_ATTRIBUTES,
  type TagAttribute,
} from "@/src/db/schema";

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
  const { placeId, attribute, displayName } = body as Record<string, unknown>;

  if (typeof placeId !== "string" || !placeId) return badRequest("place_id_required");
  if (
    typeof attribute !== "string" ||
    !(TAG_ATTRIBUTES as readonly string[]).includes(attribute)
  ) {
    return badRequest("invalid_attribute");
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
    eq(tagMarks.browserId, auth.browserId),
    eq(tagMarks.placeId, placeId),
    eq(tagMarks.attribute, attribute as TagAttribute),
  );

  const existing = db.select().from(tagMarks).where(where).get();

  let active: boolean;
  if (existing) {
    db.delete(tagMarks).where(where).run();
    active = false;
  } else {
    db.insert(tagMarks)
      .values({
        browserId: auth.browserId,
        placeId,
        attribute: attribute as TagAttribute,
        displayName: name.value,
      })
      .run();
    active = true;
  }

  return NextResponse.json({ active });
}
