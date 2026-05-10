import { and, desc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { authForWrite, badRequest, cleanDisplayName } from "@/lib/api";
import { getDb } from "@/src/db/client";
import { submissions } from "@/src/db/schema";

const URL_MAX = 2048;
const NAME_MAX = 200;
const ADDRESS_MAX = 300;

function trimOrNull(raw: unknown, max: number): string | null | "invalid" {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string") return "invalid";
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) return "invalid";
  return trimmed;
}

export async function GET(): Promise<NextResponse> {
  const auth = await authForWrite();
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  const rows = db
    .select({
      id: submissions.id,
      sourceUrl: submissions.sourceUrl,
      nameInput: submissions.nameInput,
      addressInput: submissions.addressInput,
      submittedAt: submissions.submittedAt,
    })
    .from(submissions)
    .where(
      and(
        eq(submissions.browserId, auth.browserId),
        eq(submissions.status, "pending"),
      ),
    )
    .orderBy(desc(submissions.submittedAt))
    .all();

  return NextResponse.json({ submissions: rows });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authForWrite();
  if (auth instanceof NextResponse) return auth;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequest("invalid_json");
  }
  if (!raw || typeof raw !== "object") return badRequest("invalid_body");
  const { sourceUrl, nameInput, addressInput, displayName } =
    raw as Record<string, unknown>;

  const url = trimOrNull(sourceUrl, URL_MAX);
  if (url === "invalid") return badRequest("invalid_source_url");
  const name = trimOrNull(nameInput, NAME_MAX);
  if (name === "invalid") return badRequest("invalid_name");
  const address = trimOrNull(addressInput, ADDRESS_MAX);
  if (address === "invalid") return badRequest("invalid_address");

  // Either a URL OR a name+address pair — never a mix, never neither.
  // The resolver runs at admin-approval time; we don't validate that the URL
  // points at a real place here.
  if (url && (name || address)) return badRequest("either_url_or_name_address");
  if (!url && !(name && address)) return badRequest("missing_input");
  if (url && !/^https?:\/\//i.test(url)) return badRequest("invalid_source_url");

  const cleanName = cleanDisplayName(displayName);
  if (!cleanName.ok) return cleanName.error;

  const db = getDb();
  const inserted = db
    .insert(submissions)
    .values({
      browserId: auth.browserId,
      displayName: cleanName.value,
      sourceUrl: url,
      nameInput: name,
      addressInput: address,
    })
    .returning()
    .get();

  return NextResponse.json({
    submission: {
      id: inserted.id,
      sourceUrl: inserted.sourceUrl,
      nameInput: inserted.nameInput,
      addressInput: inserted.addressInput,
      submittedAt: inserted.submittedAt,
    },
  });
}
