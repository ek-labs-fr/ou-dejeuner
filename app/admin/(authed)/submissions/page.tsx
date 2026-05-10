import { desc, eq } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import { submissions } from "@/src/db/schema";

import { SubmissionsTable } from "./SubmissionsTable";

export default async function AdminSubmissionsPage() {
  const db = getDb();
  const rows = db
    .select({
      id: submissions.id,
      displayName: submissions.displayName,
      browserId: submissions.browserId,
      sourceUrl: submissions.sourceUrl,
      nameInput: submissions.nameInput,
      addressInput: submissions.addressInput,
      submittedAt: submissions.submittedAt,
    })
    .from(submissions)
    .where(eq(submissions.status, "pending"))
    .orderBy(desc(submissions.submittedAt))
    .all();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-teal-900">
          Pending submissions
        </h1>
        <p className="mt-1 text-sm text-teal-700/80">
          Approving opens a manual form — fill in the restaurant data
          yourself. No Google API call, no charge. Bulk reject caps at 25.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-teal-700/15 bg-white p-6 text-center text-sm text-teal-700/70">
          Nothing pending.
        </p>
      ) : (
        <SubmissionsTable
          rows={rows.map((r) => ({
            id: r.id,
            displayName: r.displayName,
            browserId: r.browserId,
            sourceUrl: r.sourceUrl,
            nameInput: r.nameInput,
            addressInput: r.addressInput,
            submittedAt:
              r.submittedAt instanceof Date
                ? r.submittedAt.toISOString()
                : String(r.submittedAt),
          }))}
        />
      )}
    </div>
  );
}
