import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { authForWrite, badRequest, cleanDisplayName } from "@/lib/api";
import { getDb } from "@/src/db/client";
import { closureReports, restaurants } from "@/src/db/schema";

const NOTE_MAX = 280;
const ISSUE_TYPES = ["closed", "not_lunch", "incorrect_info", "other"] as const;
type IssueType = (typeof ISSUE_TYPES)[number];

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
  const { placeId, displayName, issueType, note } = body as Record<string, unknown>;

  if (typeof placeId !== "string" || !placeId) return badRequest("place_id_required");
  const name = cleanDisplayName(displayName);
  if (!name.ok) return name.error;

  let cleanIssueType: IssueType = "closed";
  if (issueType !== undefined && issueType !== null) {
    if (typeof issueType !== "string" || !(ISSUE_TYPES as readonly string[]).includes(issueType)) {
      return badRequest("invalid_issue_type");
    }
    cleanIssueType = issueType as IssueType;
  }

  let cleanNote: string | null = null;
  if (note !== undefined && note !== null && note !== "") {
    if (typeof note !== "string") return badRequest("invalid_note");
    cleanNote = note.trim().slice(0, NOTE_MAX) || null;
  }

  const db = getDb();
  const place = db
    .select({ placeId: restaurants.placeId })
    .from(restaurants)
    .where(eq(restaurants.placeId, placeId))
    .get();
  if (!place) return NextResponse.json({ error: "not_found" }, { status: 404 });

  db.insert(closureReports)
    .values({
      placeId,
      browserId: auth.browserId,
      displayName: name.value,
      issueType: cleanIssueType,
      note: cleanNote,
    })
    .run();

  return NextResponse.json({ ok: true });
}
