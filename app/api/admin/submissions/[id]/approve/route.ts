import { NextResponse, type NextRequest } from "next/server";

import { manualApproveSubmission, type ApproveFields } from "@/lib/admin-approve";
import { authForAdmin, badRequest } from "@/lib/api";
import { getDb } from "@/src/db/client";

type Ctx = { params: Promise<{ id: string }> };

const NAME_MAX = 200;
const ADDRESS_MAX = 300;
const URL_MAX = 2048;
const TYPE_MAX = 80;
const PLACE_ID_MAX = 256;

const PRICE_LEVELS: ReadonlySet<string> = new Set([
  "PRICE_LEVEL_INEXPENSIVE",
  "PRICE_LEVEL_MODERATE",
  "PRICE_LEVEL_EXPENSIVE",
  "PRICE_LEVEL_VERY_EXPENSIVE",
]);

function parseId(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function trimRequired(raw: unknown, max: number): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t || t.length > max) return null;
  return t;
}

function trimOptional(raw: unknown, max: number): string | null | "invalid" {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string") return "invalid";
  const t = raw.trim();
  if (!t) return null;
  if (t.length > max) return "invalid";
  return t;
}

export async function POST(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
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
  if (!body || typeof body !== "object") return badRequest("invalid_body");

  const name = trimRequired(body.name, NAME_MAX);
  if (!name) return badRequest("name_required");
  const address = trimRequired(body.address, ADDRESS_MAX);
  if (!address) return badRequest("address_required");
  const googleMapsUri = trimRequired(body.googleMapsUri, URL_MAX);
  if (!googleMapsUri) return badRequest("google_maps_uri_required");
  if (!/^https?:\/\//i.test(googleMapsUri)) return badRequest("invalid_google_maps_uri");

  const lat = typeof body.latitude === "number" ? body.latitude : NaN;
  const lng = typeof body.longitude === "number" ? body.longitude : NaN;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return badRequest("invalid_latitude");
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return badRequest("invalid_longitude");

  const placeId = trimOptional(body.placeId, PLACE_ID_MAX);
  if (placeId === "invalid") return badRequest("invalid_place_id");
  const primaryType = trimOptional(body.primaryType, TYPE_MAX);
  if (primaryType === "invalid") return badRequest("invalid_primary_type");
  const priceLevel = trimOptional(body.priceLevel, 40);
  if (priceLevel === "invalid") return badRequest("invalid_price_level");
  if (priceLevel && !PRICE_LEVELS.has(priceLevel)) return badRequest("invalid_price_level");

  const fields: ApproveFields = {
    placeId,
    name,
    address,
    googleMapsUri,
    latitude: lat,
    longitude: lng,
    primaryType,
    priceLevel,
  };

  const result = manualApproveSubmission(getDb(), id, fields);
  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : result.error === "not_pending" ? 409 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json(result);
}
